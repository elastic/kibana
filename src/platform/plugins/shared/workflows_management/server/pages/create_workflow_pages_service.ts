/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WORKFLOWS_PAGES_ENABLED_FLAG } from '@kbn/workflows';
import type { WorkflowsManagementApiActions } from '@kbn/workflows';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAuditLog, WorkflowPagesServiceDeps } from './workflow_pages_service';
import { WorkflowPagesService } from './workflow_pages_service';

const includedHiddenTypes = [WORKFLOW_PAGE_SAVED_OBJECT_TYPE];

/** Builds the pages service from the core and ESO start contracts. */
export const createWorkflowPagesService = ({
  coreStart,
  encryptedSavedObjectsSetup,
  encryptedSavedObjectsStart,
  logger,
  audit,
  authz,
  assertWorkflowAccess,
}: {
  coreStart: CoreStart;
  /** Undefined when security is off. Every privilege check then passes, like in routes. */
  authz: SecurityPluginStart['authz'] | undefined;
  assertWorkflowAccess: WorkflowPagesServiceDeps['assertWorkflowAccess'];
  encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup;
  encryptedSavedObjectsStart: EncryptedSavedObjectsPluginStart;
  logger: Logger;
  audit: WorkflowPageAuditLog;
}): WorkflowPagesService => {
  // Follows the flag for the plugin lifetime, so turning it off stops the lifecycle at once.
  let enabled = false;
  coreStart.featureFlags
    .getBooleanValue$(WORKFLOWS_PAGES_ENABLED_FLAG, false)
    .subscribe((value) => {
      enabled = value;
    });

  return new WorkflowPagesService({
    logger,
    canEncrypt: encryptedSavedObjectsSetup.canEncrypt,
    getInternalClient: async () =>
      coreStart.savedObjects.getUnsafeInternalClient({ includedHiddenTypes }),
    getScopedClient: async (request) =>
      coreStart.savedObjects.getScopedClient(request, { includedHiddenTypes }),
    getEncryptedClient: async () => encryptedSavedObjectsStart.getClient({ includedHiddenTypes }),
    isEnabled: async () => enabled,
    audit,
    hasPrivileges: async (
      request: KibanaRequest,
      spaceId: string,
      apiActions: readonly WorkflowsManagementApiActions[]
    ) => {
      if (!authz) {
        return true;
      }
      const { hasAllRequested } = await authz.checkPrivilegesWithRequest(request).atSpace(spaceId, {
        kibana: apiActions.map((action) => authz.actions.api.get(action)),
      });
      return hasAllRequested;
    },
    assertWorkflowAccess,
  });
};
