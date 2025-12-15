/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  IContextProvider,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  SecretsRequestHandlerContext,
  SecretsServerPluginSetup,
  SecretsServerPluginSetupDeps,
  SecretsServerPluginStart,
  SecretsServerPluginStartDeps,
} from './types';
import { SECRET_SAVED_OBJECT_TYPE } from './saved_objects/constants';
import { registerRoutes } from './routes';
import { setupSecretsSavedObjects } from './saved_objects';
import { SecretClient } from './secret_client/secret_client';

export class SecretsServerPlugin
  implements
    Plugin<
      SecretsServerPluginSetup,
      SecretsServerPluginStart,
      SecretsServerPluginSetupDeps,
      SecretsServerPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<SecretsServerPluginStartDeps, SecretsServerPluginStart>,
    plugins: SecretsServerPluginSetupDeps
  ): SecretsServerPluginSetup {
    setupSecretsSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    core.http.registerRouteHandlerContext<SecretsRequestHandlerContext, 'secrets'>(
      'secrets',
      this.createRouteHandlerContext(core, plugins)
    );

    registerRoutes(core.http.createRouter<SecretsRequestHandlerContext>());

    return {};
  }

  public start(core: CoreStart, plugins: SecretsServerPluginStartDeps): SecretsServerPluginStart {
    return {
      getSecretClientWithRequest: (request: KibanaRequest) => {
        return new SecretClient({
          soClient: core.savedObjects.getScopedClient(request),
          esoClient: plugins.encryptedSavedObjects.getClient({
            includedHiddenTypes: [SECRET_SAVED_OBJECT_TYPE],
          }),
          logger: this.logger,
        });
      },
    };
  }

  public stop() {}

  private createRouteHandlerContext = (
    core: CoreSetup<SecretsServerPluginStartDeps>,
    plugins: SecretsServerPluginSetupDeps
  ): IContextProvider<SecretsRequestHandlerContext, 'secrets'> => {
    return async function secretsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { encryptedSavedObjects }] = await core.getStartServices();
      return {
        secretClient: new SecretClient({
          soClient: savedObjects.getScopedClient(request),
          esoClient: encryptedSavedObjects.getClient({
            includedHiddenTypes: [SECRET_SAVED_OBJECT_TYPE],
          }),
          logger: this.logger,
        }),
      };
    };
  };
}
