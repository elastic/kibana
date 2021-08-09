/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import path from 'path';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import { createCertificate, createConfig, isWriteable } from './enroll';

export function defineConfigureRoute({
  router,
  core,
  initializerContext,
  logger,
  completeSetup,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/configure',
      validate: {
        body: schema.oneOf([
          schema.object({
            hosts: schema.arrayOf(schema.uri({ scheme: 'https' }), {
              minSize: 1,
              maxSize: 1,
            }),
            username: schema.maybe(schema.string()),
            password: schema.maybe(schema.string()),
            caCert: schema.string(),
          }),
          schema.object({
            hosts: schema.arrayOf(schema.uri({ scheme: 'http' }), {
              minSize: 1,
              maxSize: 1,
            }),
            username: schema.maybe(schema.string()),
            password: schema.maybe(schema.string()),
          }),
        ]),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!core.preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot phase`);
        return response.badRequest();
      }

      const ca = 'caCert' in request.body ? createCertificate(request.body.caCert) : undefined;

      const client = core.elasticsearch.createClient('configure', {
        hosts: request.body.hosts,
        username: request.body.username,
        password: request.body.password,
        ssl: ca ? { certificateAuthorities: [ca] } : undefined,
      });

      const configPath = initializerContext.env.mode.dev
        ? initializerContext.env.configs.find((fpath) => path.basename(fpath).includes('dev'))
        : initializerContext.env.configs[0];

      if (!configPath) {
        logger.error('Cannot find config file');
        return response.customError({ statusCode: 500, body: 'Cannot find config file.' });
      }
      const caPath = path.join(path.dirname(configPath), `ca_${Date.now()}.crt`);

      try {
        await Promise.all([isWriteable(configPath), isWriteable(caPath)]);

        await client.asInternalUser.ping();

        if (ca) {
          await fs.writeFile(caPath, ca);
        }
        await fs.appendFile(
          configPath,
          createConfig({
            elasticsearch: {
              hosts: request.body.hosts,
              username: request.body.username,
              password: request.body.password,
              ssl: { certificateAuthorities: [caPath] },
            },
          })
        );

        completeSetup({ shouldReloadConfig: true });

        return response.noContent();
      } catch (error) {
        logger.error(error);
        return response.customError({ statusCode: 500 });
      }
    }
  );
}
