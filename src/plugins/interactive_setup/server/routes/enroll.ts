/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';

import { schema } from '@kbn/config-schema';

import { ElasticsearchConnectionStatus } from '../../common';
import type { EnrollResult } from '../elasticsearch_service';
import type { RouteDefinitionParams } from './';

/**
 * Defines routes to deal with Elasticsearch `enroll_kibana` APIs.
 */
export function defineEnrollRoutes({
  router,
  logger,
  kibanaConfigWriter,
  elasticsearch,
  preboot,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/enroll',
      validate: {
        body: schema.object({
          hosts: schema.arrayOf(schema.uri({ scheme: 'https' }), {
            minSize: 1,
          }),
          apiKey: schema.string({ minLength: 1 }),
          caFingerprint: schema.string({ maxLength: 64, minLength: 64 }),
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

      // Convert a plain hex string returned in the enrollment token to a format that ES client
      // expects, i.e. to a colon delimited hex string in upper case: deadbeef -> DE:AD:BE:EF.
      const colonFormattedCaFingerprint =
        request.body.caFingerprint
          .toUpperCase()
          .match(/.{1,2}/g)
          ?.join(':') ?? '';

      let enrollResult: EnrollResult;
      try {
        enrollResult = await elasticsearch.enroll({
          apiKey: request.body.apiKey,
          hosts: request.body.hosts,
          caFingerprint: colonFormattedCaFingerprint,
        });
      } catch {
        // For security reasons, we shouldn't leak to the user whether Elasticsearch node couldn't process enrollment
        // request or we just couldn't connect to any of the provided hosts.
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to enroll.', attributes: { type: 'enroll_failure' } },
        });
      }

      try {
        await kibanaConfigWriter.writeConfig(enrollResult);
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
