/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { AccessControl } from './types';

interface AccessControlState {
  owner_id?: string;
  access_control?: AccessControl<string>;
}

type AccessControlAuditParams = {
  entityType: string;
  entityId: string;
  spaceId?: string;
} & (
  | { action: 'denied' | 'admin_override'; operation: string }
  | { action: 'update'; previous: AccessControlState; current: AccessControlState }
);

/** Records ACL changes and authorization decisions without entity contents. */
export const logEntityAccessControl = (
  core: { security: SecurityServiceStart },
  request: KibanaRequest | undefined,
  params: AccessControlAuditParams
): void => {
  const { entityType, entityId, spaceId, action } = params;
  const logger = request
    ? core.security.audit.asScoped(request)
    : core.security.audit.withoutRequest;
  const log = (message: string): void => {
    logger.log({
      message,
      event: {
        action: `${entityType}_access_control_${action}`,
        category: ['database'],
        type: [action === 'update' ? 'change' : 'access'],
        outcome: action === 'denied' ? 'failure' : 'success',
      },
      ...(spaceId ? { kibana: { space_id: spaceId } } : {}),
    });
  };
  if (action !== 'update') {
    const message =
      action === 'denied'
        ? 'Entity access denied by ACL'
        : 'Entity access allowed by administrator override';
    log(`${message} ${JSON.stringify({ entityType, entityId, operation: params.operation })}`);
    return;
  }

  const { previous, current } = params;
  const previousEntries = new Map(
    previous.access_control?.entries.map((entry) => [entry.id, entry])
  );
  const currentEntries = new Map(current.access_control?.entries.map((entry) => [entry.id, entry]));
  log(
    `Changed entity access control ${JSON.stringify({
      entityType,
      entityId,
      access_mode: current.access_control?.access_mode,
      entry_count: currentEntries.size,
      ...(previous.access_control?.access_mode !== current.access_control?.access_mode
        ? { previous_access_mode: previous.access_control?.access_mode ?? null }
        : {}),
      ...(previous.owner_id !== current.owner_id
        ? { previous_owner_id: previous.owner_id ?? null, owner_id: current.owner_id ?? null }
        : {}),
    })}`
  );

  // One event per changed user bounds message size without dropping grant or revocation details.
  for (const id of new Set([...previousEntries.keys(), ...currentEntries.keys()])) {
    const previousRole = previousEntries.get(id)?.role;
    const role = currentEntries.get(id)?.role;
    if (previousRole === role) continue;
    log(
      `Changed entity access for user ${JSON.stringify({
        entityType,
        entityId,
        user_id: id,
        previous_role: previousRole ?? null,
        role: role ?? null,
      })}`
    );
  }
};
