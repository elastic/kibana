/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { constants } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import { generateCertificate } from './enroll';

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
        body: schema.object({
          hosts: schema.arrayOf(schema.string(), { minSize: 1 }),
          username: schema.string(),
          password: schema.string(),
          caCert: schema.string(),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!core.preboot.isSetupOnHold()) {
        logger.error('Invalid attempt to access enrollment endpoint outside of preboot phase');
        return response.badRequest();
      }

      const certificateAuthority = generateCertificate(request.body.caCert);

      const client = core.elasticsearch.createClient('configure', {
        hosts: request.body.hosts,
        username: request.body.username,
        password: request.body.password,
        ssl: { certificateAuthorities: [certificateAuthority] },
      });

      const configPath = initializerContext.env.mode.dev
        ? initializerContext.env.configs.find((fpath) => path.basename(fpath).includes('dev'))
        : initializerContext.env.configs[0];

      if (!configPath) {
        logger.error('Cannot find config file');
        return response.customError({ statusCode: 500, body: 'Cannot find config file.' });
      }
      // TODO: Use fingerprint/timestamp as file name
      const caPath = path.join(path.dirname(configPath), 'ca.crt');

      try {
        await Promise.all([
          fs.access(configPath, constants.W_OK),
          fs.access(path.dirname(caPath), constants.W_OK),
        ]);

        // TODO: validate kibana system user permissions
        await client.asInternalUser.security.authenticate();

        await Promise.all([
          fs.appendFile(
            configPath,
            generateConfig(request.body.hosts, request.body.username, request.body.password, caPath)
          ),
          fs.writeFile(caPath, certificateAuthority),
        ]);

        completeSetup({ shouldReloadConfig: true });

        return response.noContent();
      } catch (error) {
        logger.error(error);
        return response.customError({ statusCode: 500, body: getDetailedErrorMessage(error) });
      }
    }
  );
}

export function generateConfig(
  hosts: string[],
  username: string,
  password: string,
  caPath: string
) {
  return `

# This section was automatically generated during setup.
elasticsearch.hosts: [ "${hosts.join('", "')}" ]
elasticsearch.username: "${username}"
elasticsearch.password: "${password}"
elasticsearch.ssl.certificateAuthorities: [ "${caPath}" ]
`;
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
