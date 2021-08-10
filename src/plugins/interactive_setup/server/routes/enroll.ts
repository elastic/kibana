/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constants } from 'fs';
import fs from 'fs/promises';
import yaml from 'js-yaml';
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
            hosts: schema.arrayOf(schema.uri({ scheme: 'https' }), {
              minSize: 1,
              maxSize: 1,
            }),
            apiKey: schema.string(),
            caFingerprint: schema.string(),
          }),
          schema.object({
            hosts: schema.arrayOf(schema.uri({ scheme: 'https' }), {
              minSize: 1,
              maxSize: 1,
            }),
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
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot phase`);
        return response.badRequest();
      }

      const configPath = initializerContext.env.mode.dev
        ? initializerContext.env.configs.find((fpath) => path.basename(fpath).includes('dev'))
        : initializerContext.env.configs[0];
      if (!configPath) {
        logger.error('Cannot find config file');
        return response.customError({ statusCode: 500, body: 'Cannot find config file.' });
      }
      const caPath = path.join(path.dirname(configPath), `ca_${Date.now()}.crt`);

      await Promise.all([isWriteable(configPath), isWriteable(caPath)]);

      const enrollClient = core.elasticsearch
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

      try {
        const enrollResponse = await enrollClient.asCurrentUser.transport.request({
          method: 'GET',
          path: '/_security/enroll/kibana',
        });

        const ca = createCertificate(enrollResponse.body.http_ca);

        const verifyConnectionClient = core.elasticsearch.createClient('verifyConnection', {
          hosts: request.body.hosts,
          username: 'kibana_system',
          password: enrollResponse.body.password,
          ssl: { certificateAuthorities: [ca] },
        });
        await verifyConnectionClient.asInternalUser.security.authenticate();

        await fs.writeFile(caPath, ca);
        await fs.appendFile(
          configPath,
          createConfig({
            elasticsearch: {
              hosts: request.body.hosts,
              username: 'kibana_system',
              password: enrollResponse.body.password,
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

export function isWriteable(fpath: string) {
  return fs.access(fpath, constants.F_OK).then(
    () => fs.access(fpath, constants.W_OK),
    () => fs.access(path.dirname(fpath), constants.W_OK)
  );
}

// Use X509Certificate once we upgraded to Node v16
export function createCertificate(pem: string) {
  if (pem.startsWith('-----BEGIN')) {
    return pem;
  }
  return `-----BEGIN CERTIFICATE-----\n${pem
    .replace(/_/g, '/')
    .replace(/-/g, '+')
    .replace(/([^\n]{1,65})/g, '$1\n')
    .replace(/\n$/g, '')}\n-----END CERTIFICATE-----\n`;
}

export function createConfig(config: any) {
  return `\n\n# This section was automatically generated during setup.\n${yaml.dump(config)}\n`;
}

export function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}
