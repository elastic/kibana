/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import type { InternalSecurityServiceStart } from '@kbn/core-security-server-internal';
import type {
  UserStorageDefinition,
  UserStorageRegistrations,
} from '@kbn/core-user-storage-common';
import type {
  UserStorageServiceSetup,
  UserStorageServiceStart,
} from '@kbn/core-user-storage-server';
import {
  userStorageType,
  userStorageGlobalType,
  USER_STORAGE_SO_TYPE,
  USER_STORAGE_GLOBAL_SO_TYPE,
} from './saved_objects';
import { UserStorageClient } from './user_storage_client';
import { registerRoutes } from './routes';

export interface UserStorageSetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: SavedObjectsServiceSetup;
}

export interface UserStorageStartDeps {
  savedObjects: InternalSavedObjectsServiceStart;
  security: InternalSecurityServiceStart;
}

/** @internal */
export class UserStorageService {
  private readonly definitions = new Map<string, UserStorageDefinition>();
  private readonly logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user-storage');
  }

  public setup({ http, savedObjects }: UserStorageSetupDeps): UserStorageServiceSetup {
    this.logger.debug('Setting up user storage service');

    savedObjects.registerType(userStorageType);
    savedObjects.registerType(userStorageGlobalType);

    const router = http.createRouter<RequestHandlerContext>('');
    registerRoutes({ router, definitions: this.definitions, logger: this.logger });

    return {
      register: (registrations: UserStorageRegistrations) => {
        for (const [key, definition] of Object.entries(registrations)) {
          if (this.definitions.has(key)) {
            throw new Error(`userStorage key [${key}] has already been registered`);
          }
          try {
            definition.schema.parse(definition.defaultValue);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(
              `userStorage key [${key}] has a defaultValue that does not match its schema: ${message}`
            );
          }
          this.definitions.set(key, definition);
        }
      },
    };
  }

  public start({ savedObjects, security }: UserStorageStartDeps): UserStorageServiceStart {
    this.logger.debug('Starting user storage service');

    return {
      asScoped: (request: KibanaRequest) => {
        const profileUid = security.authc.getCurrentUser(request)?.profile_uid;
        if (!profileUid) return null;

        const savedObjectsClient = savedObjects.getScopedClient(request, {
          includedHiddenTypes: [USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE],
        });

        return new UserStorageClient({
          savedObjectsClient,
          profileUid,
          definitions: this.definitions,
          logger: this.logger,
        });
      },
    };
  }

  public stop() {
    this.logger.debug('Stopping user storage service');
  }
}
