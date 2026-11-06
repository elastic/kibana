/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest, Logger, SavedObjectsServiceSetup } from '@kbn/core/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { registerWorkflowPageType, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { AssertWorkflowAccess, WorkflowPageAuditLog, WorkflowPageOperation } from './types';
import type { WorkflowPagesClient } from './workflow_pages_client';
import { WorkflowPagesClientImpl } from './workflow_pages_client';
import type { WorkflowPagesSystemClient } from './workflow_pages_system_client';
import { WorkflowPagesSystemClientImpl } from './workflow_pages_system_client';

const includedHiddenTypes = [WORKFLOW_PAGE_SAVED_OBJECT_TYPE];

const PAGE_OPERATIONS: readonly WorkflowPageOperation[] = ['readPage', 'managePage'];

export interface WorkflowPagesServiceSetupDeps {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface WorkflowPagesServiceStartDeps {
  core: CoreStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  /** Undefined when security is off. Every privilege check then passes, like on routes. */
  authz: SecurityPluginStart['authz'] | undefined;
  getSpaceId: (request: KibanaRequest) => string;
  assertWorkflowAccess: AssertWorkflowAccess;
  audit: WorkflowPageAuditLog;
  logger: Logger;
}

export interface WorkflowPagesServiceStart {
  /** Page operations for one request. Resolves the space and the caller's privileges once. */
  getClient(params: { request: KibanaRequest }): Promise<WorkflowPagesClient>;
  /** Lifecycle and public-link checks, without a user. For workflows internals only. */
  getSystemClient(): WorkflowPagesSystemClient;
}

/** Owns the `workflow-page` saved objects. Exists only with `workflowsManagement.pages.enabled`. */
export class WorkflowPagesService {
  private canEncrypt = false;

  setup({ savedObjects, encryptedSavedObjects }: WorkflowPagesServiceSetupDeps): void {
    this.canEncrypt = encryptedSavedObjects.canEncrypt;
    registerWorkflowPageType({ savedObjects, encryptedSavedObjects });
  }

  start(deps: WorkflowPagesServiceStartDeps): WorkflowPagesServiceStart {
    const { core, encryptedSavedObjects, authz, getSpaceId, assertWorkflowAccess, audit, logger } =
      deps;
    const internalClient = core.savedObjects.getUnsafeInternalClient({ includedHiddenTypes });
    const encryptedClient = encryptedSavedObjects.getClient({ includedHiddenTypes });
    const systemClient = new WorkflowPagesSystemClientImpl({
      logger,
      canEncrypt: this.canEncrypt,
      savedObjectsClient: internalClient,
    });

    const resolvePrivileges = async (
      request: KibanaRequest,
      spaceId: string
    ): Promise<Record<WorkflowPageOperation, boolean>> => {
      if (!authz) {
        return { readPage: true, managePage: true };
      }
      const toAction = (privilege: string) => authz.actions.api.get(privilege);
      const requested = [
        ...new Set(
          PAGE_OPERATIONS.flatMap((operation) =>
            WorkflowsManagementOperationPrivileges[operation].map(toAction)
          )
        ),
      ];
      const { privileges } = await authz
        .checkPrivilegesWithRequest(request)
        .atSpace(spaceId, { kibana: requested });
      const authorized = new Set(
        privileges.kibana.filter((entry) => entry.authorized).map((entry) => entry.privilege)
      );
      const allows = (operation: WorkflowPageOperation) =>
        WorkflowsManagementOperationPrivileges[operation].every((privilege) =>
          authorized.has(toAction(privilege))
        );
      return { readPage: allows('readPage'), managePage: allows('managePage') };
    };

    return {
      getClient: async ({ request }) => {
        const spaceId = getSpaceId(request);
        return new WorkflowPagesClientImpl({
          request,
          spaceId,
          privileges: await resolvePrivileges(request, spaceId),
          canEncrypt: this.canEncrypt,
          internalClient,
          scopedClient: core.savedObjects.getScopedClient(request, { includedHiddenTypes }),
          encryptedClient,
          assertWorkflowAccess,
          audit,
        });
      },
      getSystemClient: () => systemClient,
    };
  }
}
