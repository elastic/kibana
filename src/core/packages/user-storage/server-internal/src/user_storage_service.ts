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
  IUserStorageClient,
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
  /**
   * Populated in `start()`; routes call this to get a scoped client. Using a
   * mutable reference avoids a hard dependency between the route setup (which
   * runs during `setup()`) and the start-time dependencies (savedObjects,
   * security) that are only available once `start()` fires.
   */
  private scopedClientFactory: ((request: KibanaRequest) => IUserStorageClient | null) | null =
    null;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user-storage');
  }

  public setup({ http, savedObjects }: UserStorageSetupDeps): UserStorageServiceSetup {
    this.logger.debug('Setting up user storage service');

    savedObjects.registerType(userStorageType);
    savedObjects.registerType(userStorageGlobalType);

    const router = http.createRouter<RequestHandlerContext>('');
    registerRoutes({
      router,
      getClient: (request) => {
        if (!this.scopedClientFactory) {
          this.logger.error(
            'userStorage.getClient called before start() completed; returning null.'
          );
          return null;
        }
        return this.scopedClientFactory(request);
      },
    });

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
          if (definition.schema.safeParse(undefined).success) {
            throw new Error(
              `userStorage key [${key}] schema must not accept undefined. ` +
                `undefined is reserved for absent cache entries and JSON.stringify omits ` +
                `undefined properties, so it cannot be a reliable stored value.`
            );
          }
          if (definition.schema.safeParse(null).success) {
            throw new Error(
              `userStorage key [${key}] schema must not accept null. ` +
                `null is reserved as the removal tombstone in the underlying storage layer.`
            );
          }
          this.definitions.set(key, definition);
        }
      },
    };
  }

  public start({ savedObjects, security }: UserStorageStartDeps): UserStorageServiceStart {
    this.logger.debug('Starting user storage service');

    const asScoped = (request: KibanaRequest): IUserStorageClient | null => {
      const profileUid = security.authc.getCurrentUser(request)?.profile_uid;
      if (!profileUid) return null;

      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE],
      });

      // Resolve the active space namespace so that space-scoped document ids are
      // namespaced (e.g. `<space>:<profile_uid>`), preventing cross-space id
      // collisions on the `multiple-isolated` SO type.
      //
      // This must be read from the scoped client (not a bare
      // `createScopedRepository`): `getScopedClient` applies the spaces extension
      // via the client provider, so `getCurrentNamespace()` reflects the request's
      // space. A repository built directly from `createScopedRepository` without
      // extensions has no spaces extension and always returns `undefined`.
      const namespace = savedObjectsClient.getCurrentNamespace();

      return new UserStorageClient({
        savedObjectsClient,
        profileUid,
        namespace,
        definitions: this.definitions,
        logger: this.logger,
      });
    };

    // Make the factory available to the routes registered during setup().
    this.scopedClientFactory = asScoped;

    return { asScoped };
  }

  public stop() {
    this.logger.debug('Stopping user storage service');
    this.scopedClientFactory = null;
  }
}
