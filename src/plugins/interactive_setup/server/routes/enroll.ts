/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constants } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from './';

/**
 * Defines routes to deal with Elasticsearch `enroll_kibana` APIs.
 */
export function defineEnrollRoutes({
  router,
  logger,
  initializerContext,
  core,
  completeSetup,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/enroll',
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
      const client = core.elasticsearch
        .createClient('enroll', {
          hosts: request.body.hosts,
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

        const { body } = await client.asCurrentUser.transport.request({
          method: 'GET',
          path: '/_security/enroll/kibana',
        });

        const certificateAuthority = generateCertificate(body.http_ca);

        // Ensure we can connect using CA before writing config
        const verifyConnectionClient = core.elasticsearch.createClient('verifyConnection', {
          hosts: request.body.hosts,
          username: 'kibana_system',
          password: body.password,
          ssl: { certificateAuthorities: [certificateAuthority] },
        });

        await verifyConnectionClient.asInternalUser.security.authenticate();

        await Promise.all([
          fs.appendFile(
            configPath,
            generateConfig(request.body.hosts, 'kibana_system', body.password, caPath)
          ),
          fs.writeFile(caPath, certificateAuthority),
        ]);

        completeSetup({ shouldReloadConfig: true });

        return response.noContent();
      } catch (error) {
        logger.error(error);
        return response.customError({ statusCode: 500 });
      }
    }
  );
}

export function generateCertificate(pem: string) {
  if (pem.startsWith('-----BEGIN')) {
    return pem;
  }
  return `-----BEGIN CERTIFICATE-----
${pem
  .replace(/_/g, '/')
  .replace(/-/g, '+')
  .replace(/([^\n]{1,65})/g, '$1\n')
  .replace(/\n$/g, '')}
-----END CERTIFICATE-----
`;
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

export function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}
