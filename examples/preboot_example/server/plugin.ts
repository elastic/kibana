/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { CorePreboot, PrebootPlugin, PluginInitializerContext } from 'src/core/server';
import fs from 'fs/promises';
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { ConfigType } from './config';

export function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  if (Boom.isBoom(error)) {
    return JSON.stringify(error.output.payload);
  }

  return error.message;
}

export class PrebootExamplePlugin implements PrebootPlugin {
  readonly #initializerContext: PluginInitializerContext<ConfigType>;
  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.#initializerContext = initializerContext;
  }

  public setup(core: CorePreboot) {
    const { skipSetup } = this.#initializerContext.config.get<ConfigType>();
    let completeSetup: (result: { shouldReloadConfig: boolean }) => void;

    core.http.registerRoutes('', (prebootRouter) => {
      prebootRouter.get(
        {
          path: '/api/preboot/state',
          validate: false,
          options: { authRequired: false },
        },
        (_, request, response) => {
          const isSetupModeActive = !skipSetup && core.preboot.isSetupOnHold();
          return response.ok({ body: { isSetupModeActive } });
        }
      );
      if (skipSetup) {
        return;
      }

      prebootRouter.post(
        {
          path: '/api/preboot/complete_setup',
          validate: {
            body: schema.object({ shouldReloadConfig: schema.boolean() }),
          },
          options: { authRequired: false },
        },
        (_, request, response) => {
          completeSetup({ shouldReloadConfig: request.body.shouldReloadConfig });
          return response.noContent();
        }
      );

      prebootRouter.post(
        {
          path: '/api/preboot/write_config',
          validate: {
            body: schema.object({ key: schema.string(), value: schema.string() }),
          },
          options: { authRequired: false },
        },
        async (_, request, response) => {
          const configPath = this.#initializerContext.env.configs.find((path) =>
            path.includes('dev')
          );

          if (!configPath) {
            return response.customError({ statusCode: 500, body: 'Cannot find dev config.' });
          }

          await fs.appendFile(configPath, `${request.body.key}: ${request.body.value}\n`);
          return response.noContent();
        }
      );

      prebootRouter.post(
        {
          path: '/api/preboot/connect_to_es',
          validate: {
            body: schema.object({
              host: schema.string(),
              username: schema.string(),
              password: schema.string(),
            }),
          },
          options: { authRequired: false },
        },
        async (_, request, response) => {
          const esClient = core.elasticsearch.createClient('data', {
            hosts: [request.body.host],
          });

          const scopedClient = esClient.asScoped({
            headers: {
              authorization: `Basic ${Buffer.from(
                `${request.body.username}:${request.body.password}`
              ).toString('base64')}`,
            },
          });

          try {
            return response.ok({
              body: await scopedClient.asCurrentUser.security.authenticate(),
            });
          } catch (err) {
            return response.customError({ statusCode: 500, body: getDetailedErrorMessage(err) });
          }
        }
      );

      core.preboot.holdSetupUntilResolved(
        'Elasticsearch connection is not set up',
        new Promise<{ shouldReloadConfig: boolean }>((resolve) => {
          completeSetup = resolve;
        })
      );
    });
  }

  public stop() {}
}
