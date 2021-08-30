/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import { ElasticsearchConnectionStatus } from '../../common';
import type { AuthenticateParameters } from '../elasticsearch_service';
import { ElasticsearchService } from '../elasticsearch_service';
import type { WriteConfigParameters } from '../kibana_config_writer';

export function defineConfigureRoute({
  router,
  logger,
  kibanaConfigWriter,
  elasticsearch,
  preboot,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/configure',
      validate: {
        query: schema.object({
          code: schema.maybe(schema.string()),
        }),
        body: schema.object({
          host: schema.uri({ scheme: ['http', 'https'] }),
          username: schema.maybe(
            schema.string({
              validate: (value: string) => {
                if (value === 'elastic') {
                  return (
                    'value of "elastic" is forbidden. This is a superuser account that can obfuscate ' +
                    'privilege-related issues. You should use the "kibana_system" user instead.'
                  );
                }
              },
            })
          ),
          password: schema.conditional(
            schema.siblingRef('username'),
            schema.string(),
            schema.string(),
            schema.never()
          ),
          caCert: schema.conditional(
            schema.siblingRef('host'),
            schema.uri({ scheme: 'https' }),
            schema.string(),
            schema.never()
          ),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot stage`);
        return response.badRequest({ body: 'Cannot process request outside of preboot stage.' });
      }

      const connectionStatus = await elasticsearch.connectionStatus$.pipe(first()).toPromise();
      if (connectionStatus === ElasticsearchConnectionStatus.Configured) {
        logger.error(
          `Invalid request to [path=${request.url.pathname}], Elasticsearch connection is already configured.`
        );
        return response.badRequest({
          body: {
            message: 'Elasticsearch connection is already configured.',
            attributes: { type: 'elasticsearch_connection_configured' },
          },
        });
      }

      // The most probable misconfiguration case is when Kibana process isn't allowed to write to the
      // Kibana configuration file. We'll still have to handle possible filesystem access errors
      // when we actually write to the disk, but this preliminary check helps us to avoid unnecessary
      // enrollment call and communicate that to the user early.
      const isConfigWritable = await kibanaConfigWriter.isConfigWritable();
      if (!isConfigWritable) {
        logger.error('Kibana process does not have enough permissions to write to config file');
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Kibana process does not have enough permissions to write to config file.',
            attributes: { type: 'kibana_config_not_writable' },
          },
        });
      }

      const configToWrite: WriteConfigParameters & AuthenticateParameters = {
        host: request.body.host,
        username: request.body.username,
        password: request.body.password,
        caCert: request.body.caCert
          ? ElasticsearchService.createPemCertificate(request.body.caCert)
          : undefined,
      };

      try {
        await elasticsearch.authenticate(configToWrite);
      } catch {
        // For security reasons, we shouldn't leak to the user whether Elasticsearch node couldn't process enrollment
        // request or we just couldn't connect to any of the provided hosts.
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to configure.', attributes: { type: 'configure_failure' } },
        });
      }

      try {
        await kibanaConfigWriter.writeConfig(configToWrite);
      } catch {
        // For security reasons, we shouldn't leak any filesystem related errors.
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to save configuration.',
            attributes: { type: 'kibana_config_failure' },
          },
        });
      }

      preboot.completeSetup({ shouldReloadConfig: true });

      return response.noContent();
    }
  );
}
