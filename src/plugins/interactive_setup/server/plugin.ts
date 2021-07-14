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
import chalk from 'chalk';
import type { ConfigType } from './config';

export class InteractiveSetupPlugin implements PrebootPlugin {
  readonly #initializerContext: PluginInitializerContext<ConfigType>;
  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.#initializerContext = initializerContext;
  }

  public setup(core: CorePreboot) {
    const { enabled } = this.#initializerContext.config.get<ConfigType>();

    const isDev = this.#initializerContext.env.mode.dev;
    const isConfigured =
      core.elasticsearch.config.credentialsSpecified && core.elasticsearch.config.hosts.length;

    /**
     * env: dev -> enabled: false -> skip
     * env: dev -> enabled: undefined -> skip
     * env: dev -> enabled: true -> hold setup
     * env: prod -> enabled: false -> skip
     * env: prod -> enabled: undefined -> hold setup if not configured
     * env: prod -> enabled: true -> hold setup if not configured
     */
    const shouldHoldSetupPhase = isDev
      ? enabled === true
      : enabled !== false
      ? !isConfigured
      : false;

    if (!shouldHoldSetupPhase) {
      return;
    }

    core.http.registerRoutes('', (prebootRouter) => {
      let completeSetup: (result: { shouldReloadConfig: boolean }) => void;

      prebootRouter.post(
        {
          path: '/api/preboot/setup',
          validate: {
            body: schema.oneOf([
              schema.object({
                hosts: schema.arrayOf(schema.string(), { minSize: 1 }),
                apiKey: schema.string(),
                caFingerprint: schema.string(),
              }),
              schema.object({
                hosts: schema.arrayOf(schema.string(), { minSize: 1 }),
                username: schema.string(),
                password: schema.string(),
                caFingerprint: schema.string(),
              }),
            ]),
          },
          options: { authRequired: false },
        },
        async (context, request, response) => {
          if (!core.preboot.isSetupOnHold()) {
            return response.badRequest();
          }

          const client = core.elasticsearch
            .createClient('data', {
              hosts: request.body.hosts.map((host) => `https://${host}`),
              ssl: { verificationMode: 'none' },
              // caFingerprint: request.body.caFingerprint,
            })
            .asScoped({
              headers: {
                authorization:
                  'apiKey' in request.body
                    ? `ApiKey ${btoa(request.body.apiKey)}`
                    : `Basic ${btoa(`${request.body.username}:${request.body.password}`)}`,
              },
            });

          try {
            const { body } = await client.asCurrentUser.transport.request({
              method: 'GET',
              path: '/_security/enroll/kibana',
            });

            const configPath = isDev
              ? this.#initializerContext.env.configs.find((path) => path.includes('dev'))
              : this.#initializerContext.env.configs[0];

            if (!configPath) {
              return response.customError({ statusCode: 500, body: 'Cannot find config file.' });
            }

            await fs.appendFile(
              configPath,
              `

elasticsearch.hosts: [${request.body.hosts.map((host) => `"https://${host}"`).join(', ')}]
elasticsearch.username: "kibana_system"
elasticsearch.password: "${body.password}"
elasticsearch.ssl.verificationMode: "none"
`
            );

            completeSetup({ shouldReloadConfig: true });

            return response.noContent();
          } catch (err) {
            return response.customError({ statusCode: 500, body: getDetailedErrorMessage(err) });
          }
        }
      );

      core.preboot.holdSetupUntilResolved(
        `\n\n${chalk.bold(
          chalk.whiteBright(`${chalk.cyanBright('i')} Kibana has not been configured.`)
        )}\n\nGo to ${chalk.cyanBright(
          chalk.underline('http://localhost:5601')
        )} to get started.\n`,
        new Promise((resolve) => {
          completeSetup = resolve;
        })
      );
    });
  }

  public stop() {}
}

export function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}

export function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  if (Boom.isBoom(error)) {
    return JSON.stringify(error.output.payload);
  }

  return error.message;
}
