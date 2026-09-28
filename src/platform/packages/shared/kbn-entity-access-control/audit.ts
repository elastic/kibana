/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { AccessControl } from '.';

interface AccessControlState {
  owner_id?: string;
  access_control?: AccessControl<string>;
}

type AccessControlAuditParams = {
  entityType: string;
  entityId?: string;
  spaceId?: string;
} & (
  | { action: 'denied' | 'admin_override'; operation: string }
  | { action: 'update'; previous: AccessControlState; current: AccessControlState }
);

/** Records ACL changes and authorization decisions without entity contents. */
export const logEntityAccessControl = (
  core: Pick<CoreStart, 'security'>,
  request: KibanaRequest | undefined,
  params: AccessControlAuditParams
): void => {
  const { entityType, entityId, spaceId, action } = params;
  const details =
    action === 'update'
      ? {
          previous: {
            owner_id: params.previous.owner_id,
            access_control: params.previous.access_control,
          },
          current: {
            owner_id: params.current.owner_id,
            access_control: params.current.access_control,
          },
        }
      : { operation: params.operation };
  const message =
    action === 'update'
      ? 'Changed entity access control'
      : action === 'denied'
      ? 'Entity access denied by ACL'
      : 'Entity access allowed by administrator override';
  const logger = request
    ? core.security.audit.asScoped(request)
    : core.security.audit.withoutRequest;
  logger.log({
    message: `${message} ${JSON.stringify({ entityType, entityId, ...details })}`,
    event: {
      action: `${entityType}_access_control_${action}`,
      category: ['iam'],
      type: [action === 'update' ? 'change' : 'access'],
      outcome: action === 'denied' ? 'failure' : 'success',
    },
    ...(spaceId ? { kibana: { space_id: spaceId } } : {}),
  });
};
