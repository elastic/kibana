/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import type {
  UserStorageDefinition,
  UserStorageRegistrations,
} from '@kbn/core-user-storage-common';
import type {
  UserStorageServiceSetup,
  UserStorageServiceStart,
} from '@kbn/core-user-storage-server';
import { userStorageType, userStorageGlobalType } from './saved_objects';
import { UserStorageClient } from './user_storage_client';
import { registerRoutes } from './routes';

export interface UserStorageSetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: SavedObjectsServiceSetup;
}

/** @internal */
export class UserStorageService {
  private readonly definitions = new Map<string, UserStorageDefinition>();

  constructor(private readonly logger: Logger) {}

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

  public start(): UserStorageServiceStart {
    this.logger.debug('Starting user storage service');

    return {
      asScopedToClient: ({ savedObjectsClient, profileUid }) =>
        new UserStorageClient({
          savedObjectsClient,
          profileUid,
          definitions: this.definitions,
          logger: this.logger,
        }),
    };
  }

  public stop() {
    this.logger.debug('Stopping user storage service');
  }
}
