/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { WORKFLOWS_PAGES_ENABLED_FLAG } from '@kbn/workflows';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAuditLog } from './workflow_pages_service';
import { WorkflowPagesService } from './workflow_pages_service';

const includedHiddenTypes = [WORKFLOW_PAGE_SAVED_OBJECT_TYPE];

/** Builds the pages service from the core and ESO start contracts. */
export const createWorkflowPagesService = ({
  coreStart,
  encryptedSavedObjectsSetup,
  encryptedSavedObjectsStart,
  logger,
  audit,
}: {
  coreStart: CoreStart;
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
  });
};
