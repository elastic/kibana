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
import { constants } from 'fs';
import path from 'path';
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
    const config = this.#initializerContext.config.get<ConfigType>();
    const logger = this.#initializerContext.logger.get('plugins', 'interactiveSetup');

    const isDev = this.#initializerContext.env.mode.dev;
    const isManuallyConfigured =
      core.elasticsearch.config.credentialsSpecified ||
      core.elasticsearch.config.hosts.length !== 1 ||
      core.elasticsearch.config.hosts[0] !== 'http://localhost:9200';
    const skipInteractiveSetup =
      config.holdSetup === 'never'
        ? true
        : config.holdSetup === 'always'
        ? false
        : isManuallyConfigured;

    if (skipInteractiveSetup) {
      logger.info('Skipping interactive setup');
      return;
    }

    core.http.registerRoutes('', (prebootRouter) => {
      let completeSetup: (result: { shouldReloadConfig: boolean }) => void;

      prebootRouter.post(
        {
          path: '/internal/interactive_setup/enroll/kibana',
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
                caCert: schema.string(),
              }),
            ]),
          },
          options: { authRequired: false },
        },
        async (context, request, response) => {
          if (!core.preboot.isSetupOnHold()) {
            logger.error('Invalid attempt to access enrollment endpoint outside of preboot phase');
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

          const configPath = isDev
            ? this.#initializerContext.env.configs.find((fpath) =>
                path.basename(fpath).includes('dev')
              )
            : this.#initializerContext.env.configs[0];

          if (!configPath) {
            logger.error('Failed to setup Kibana due to missing config file');
            return response.customError({ statusCode: 500, body: 'Cannot find config file.' });
          }
          const caPath = path.join(path.dirname(configPath), 'ca.crt');

          try {
            await Promise.all([
              fs.access(configPath, constants.W_OK),
              fs.access(caPath, constants.W_OK),
            ]);

            const { body } = await client.asCurrentUser.transport.request({
              method: 'GET',
              path: '/_security/enroll/kibana',
            });

            await Promise.all([
              fs.appendFile(configPath, generateConfig(request.body.hosts, body.password, caPath)),
              fs.writeFile(caPath, generateCertificate(body.http_ca)),
            ]);

            completeSetup({ shouldReloadConfig: true });

            return response.noContent();
          } catch (error) {
            logger.error('Failed to setup Kibana', {
              error,
            });
            return response.customError({ statusCode: 500, body: getDetailedErrorMessage(error) });
          }
        }
      );

      const holdSetupReason = `

${chalk.bold(chalk.whiteBright(`${chalk.cyanBright('i')} Kibana has not been configured.`))}

Go to ${chalk.underline(chalk.cyanBright('http://localhost:5601'))} to get started.
`;

      core.preboot.holdSetupUntilResolved(
        holdSetupReason,
        new Promise((resolve) => {
          completeSetup = resolve;
        })
      );
    });
  }

  public stop() {}
}

export function generateCertificate(pem: string) {
  return `-----BEGIN CERTIFICATE-----
${pem
  .replace(/_/g, '/')
  .replace(/-/g, '+')
  .replace(/([^\n]{1,65})/g, '$1\n')
  .replace(/\n$/g, '')}
-----END CERTIFICATE-----
`;
}

export function generateConfig(hosts: string[], password: string, caPath: string) {
  return `

# This section was automatically generated during setup.
elasticsearch.hosts: [ ${hosts.map((host) => `"https://${host}"`).join(', ')} ]
elasticsearch.username: "kibana_system"
elasticsearch.password: "${password}"
elasticsearch.ssl.certificateAuthorities: [ "${caPath}" ]
`;
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
