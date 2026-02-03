/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { first } from 'rxjs';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import {
  ElasticsearchConnectionStatus,
  ERROR_COMPATIBILITY_FAILURE,
  ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED,
  ERROR_ENROLL_FAILURE,
  ERROR_KIBANA_CONFIG_FAILURE,
  ERROR_KIBANA_CONFIG_NOT_WRITABLE,
  ERROR_OUTSIDE_PREBOOT_STAGE,
} from '../../common';
import { CompatibilityError } from '../compatibility_error';
import { ElasticsearchService } from '../elasticsearch_service';
import type { EnrollResult } from '../elasticsearch_service';
import type { WriteConfigParameters } from '../kibana_config_writer';

/**
 * Defines routes to deal with Elasticsearch `enroll_kibana` APIs.
 */
export function defineEnrollRoutes({
  router,
  logger,
  kibanaConfigWriter,
  elasticsearch,
  verificationCode,
  preboot,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/enroll',
      security: {
        authz: {
          enabled: false,
          reason:
            'Interactive setup is strictly a "pre-boot" feature which cannot leverage conventional authorization.',
        },
      },
      validate: {
        body: schema.object({
          // codeql[js/kibana/unbounded-array-in-schema] This is a pre-boot feature and the input is trusted.
          hosts: schema.arrayOf(schema.uri({ scheme: 'https' }), {
            minSize: 1,
          }),
          apiKey: schema.string({ minLength: 1 }),
          caFingerprint: schema.string({ maxLength: 64, minLength: 64 }),
          code: schema.maybe(schema.string()),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!verificationCode.verify(request.body.code)) {
        return response.forbidden();
      }

      if (!preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot stage`);
        return response.badRequest({
          body: {
            message: 'Cannot process request outside of preboot stage.',
            attributes: { type: ERROR_OUTSIDE_PREBOOT_STAGE },
          },
        });
      }

      const connectionStatus = await elasticsearch.connectionStatus$.pipe(first()).toPromise();
      if (connectionStatus === ElasticsearchConnectionStatus.Configured) {
        logger.error(
          `Invalid request to [path=${request.url.pathname}], Elasticsearch connection is already configured.`
        );
        return response.badRequest({
          body: {
            message: 'Elasticsearch connection is already configured.',
            attributes: { type: ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED },
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
            attributes: { type: ERROR_KIBANA_CONFIG_NOT_WRITABLE },
          },
        });
      }

      let configToWrite: WriteConfigParameters & EnrollResult;
      try {
        configToWrite = await elasticsearch.enroll({
          apiKey: request.body.apiKey,
          hosts: request.body.hosts,
          caFingerprint: ElasticsearchService.formatFingerprint(request.body.caFingerprint),
        });
      } catch (error) {
        if (error instanceof CompatibilityError) {
          return response.badRequest({
            body: {
              message: 'Failed to enroll due to version incompatibility.',
              attributes: {
                type: ERROR_COMPATIBILITY_FAILURE,
                elasticsearchVersion: error.elasticsearchVersion,
                kibanaVersion: error.kibanaVersion,
              },
            },
          });
        }
        // For security reasons, we shouldn't leak to the user whether Elasticsearch node couldn't process enrollment
        // request or we just couldn't connect to any of the provided hosts.
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to enroll.', attributes: { type: ERROR_ENROLL_FAILURE } },
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
            attributes: { type: ERROR_KIBANA_CONFIG_FAILURE },
          },
        });
      }

      preboot.completeSetup({ shouldReloadConfig: true });

      return response.noContent();
    }
  );
}
