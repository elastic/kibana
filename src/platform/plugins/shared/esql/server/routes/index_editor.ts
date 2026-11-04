/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  INDEX_EDITOR_CREATE_ROUTE,
  INDEX_EDITOR_PRIVILEGES_ROUTE,
  INDEX_EDITOR_RECREATE_ROUTE,
  INDEX_EDITOR_RESOLVE_ROUTE,
  INDEX_EDITOR_UPDATE_ROUTE,
  INDEX_EDITOR_UPDATE_MAPPINGS_ROUTE,
  type IndexEditorResolution,
  type ResolveIndexResponse,
} from '@kbn/esql-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';

// The index editor supports standard indices and lookup indices. Only `lookup`
// sets an explicit index mode; `standard` relies on the Elasticsearch default.
const indexModeSchema = schema.oneOf([schema.literal('standard'), schema.literal('lookup')]);

export const registerIndexEditorRoutes = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: `${INDEX_EDITOR_UPDATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          // Elasticsearch index names are limited to 255 bytes.
          indexName: schema.string({ maxLength: 255 }),
        }),
        body: schema.object({
          // maxSize is added here to prevent DoS vulnerabilities https://github.com/elastic/kibana/pull/245533,
          operations: schema.arrayOf(schema.any(), { maxSize: 1000 }),
          // Lets callers wait until the write is searchable, so a read-after-write refetch sees it.
          refresh: schema.maybe(schema.oneOf([schema.literal('wait_for'), schema.boolean()])),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Updates an index with bulk operations',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { indexName } = request.params;
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const result = await client.bulk({
          index: indexName,
          operations: request.body.operations,
          refresh: request.body.refresh,
        });

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.update',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({
          body: result,
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.update',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().error(`Failed to bulk update index "${indexName}": ${message}`, {
          tags: ['esql', 'index_editor', 'update'],
          error: { stack_trace: error instanceof Error ? error.stack : undefined },
        });
        throw error;
      }
    }
  );

  router.post(
    {
      path: `${INDEX_EDITOR_CREATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          // Elasticsearch index names are limited to 255 bytes.
          indexName: schema.string({ maxLength: 255 }),
        }),
        // The body is optional to preserve backward compatibility: callers that
        // omit it create a lookup index, as the route did before it was generalized.
        body: schema.maybe(schema.object({ mode: schema.maybe(indexModeSchema) })),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Creates an index with the requested index mode',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { indexName } = request.params;
      const mode = request.body?.mode ?? 'lookup';
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const result = await client.indices.create({
          index: indexName,
          ...(mode === 'lookup' ? { settings: { mode: 'lookup' } } : {}),
        });

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.create',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({
          body: result,
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.create',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().error(`Failed to create index "${indexName}": ${message}`, {
          tags: ['esql', 'index_editor', 'create'],
          error: { stack_trace: error instanceof Error ? error.stack : undefined },
        });
        throw error;
      }
    }
  );

  router.post(
    {
      path: `${INDEX_EDITOR_RECREATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          // Elasticsearch index names are limited to 255 bytes.
          indexName: schema.string({ maxLength: 255 }),
        }),
        // The body is optional to preserve backward compatibility: callers that
        // omit it recreate a lookup index, as the route did before it was generalized.
        body: schema.maybe(schema.object({ mode: schema.maybe(indexModeSchema) })),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Recreates an index, used to reset the mapping of the index.',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { indexName } = request.params;
      const mode = request.body?.mode ?? 'lookup';
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        await client.indices.delete({
          index: indexName,
          ignore_unavailable: true,
        });

        const result = await client.indices.create({
          index: indexName,
          ...(mode === 'lookup' ? { settings: { mode: 'lookup' } } : {}),
        });

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.recreate',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({
          body: result,
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.recreate',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().error(`Failed to recreate index "${indexName}": ${message}`, {
          tags: ['esql', 'index_editor', 'recreate'],
          error: { stack_trace: error instanceof Error ? error.stack : undefined },
        });
        throw error;
      }
    }
  );

  router.get(
    {
      path: INDEX_EDITOR_PRIVILEGES_ROUTE,
      validate: {
        // indexName may hold a comma-separated list of index names.
        query: schema.object({ indexName: schema.maybe(schema.string({ maxLength: 1000 })) }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Checks if the user has privileges to create, read and write to an index',
      },
    },
    async (requestHandlerContext, req, res) => {
      const { indexName } = req.query;
      const indices: string[] = indexName ? indexName.split(',') : [];

      try {
        const core = await requestHandlerContext.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const { index: indexPrivileges = {} } = await esClient.security.hasPrivileges({
          index: [
            {
              names: ['*', ...indices],
              privileges: ['create_index', 'read', 'write', 'delete_index'],
            },
          ],
        });

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.privileges',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return res.ok({
          body: indexPrivileges,
        });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.privileges',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().error(`Failed to check index privileges: ${message}`, {
          tags: ['esql', 'index_editor', 'privileges'],
          error: { stack_trace: error instanceof Error ? error.stack : undefined },
        });
        throw error;
      }
    }
  );

  router.put(
    {
      path: `${INDEX_EDITOR_UPDATE_MAPPINGS_ROUTE}/{indexName}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          properties: schema.object({}, { unknowns: 'allow' }),
        }),
        params: schema.object({
          // Elasticsearch index names are limited to 255 bytes.
          indexName: schema.string({ maxLength: 255 }),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const core = await requestHandlerContext.core;
      const esClient = core.elasticsearch.client.asCurrentUser;
      const { indexName } = request.params;

      try {
        const responseBody = await esClient.indices.putMapping({
          properties: request.body.properties,
          index: indexName,
        });
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.update_mappings',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({ body: responseBody });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.update_mappings',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().error(`Failed to update mappings for index "${indexName}": ${message}`, {
          tags: ['esql', 'index_editor', 'update_mappings'],
          error: { stack_trace: error instanceof Error ? error.stack : undefined },
        });
        throw error;
      }
    }
  );

  router.get(
    {
      path: `${INDEX_EDITOR_RESOLVE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          // Elasticsearch index names are limited to 255 bytes.
          indexName: schema.string({ maxLength: 255 }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Resolves a single index name so the editor can tell whether it is editable',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { indexName } = request.params;
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const {
          indices = [],
          aliases = [],
          data_streams: dataStreams = [],
        } = (await client.indices.resolveIndex({
          name: indexName,
          expand_wildcards: 'all',
        })) as ResolveIndexResponse;

        // Only an exact-name match tells us what this concrete name is; wildcard-expanded
        // neighbours are irrelevant here.
        const index = indices.find((item) => item.name === indexName);
        const attributes = index?.attributes ?? [];
        const kind: IndexEditorResolution['kind'] = index
          ? 'index'
          : aliases.some((item) => item.name === indexName)
          ? 'alias'
          : dataStreams.some((item) => item.name === indexName)
          ? 'dataStream'
          : 'none';
        const closed = attributes.includes('closed');

        // `_routing.required` and the `_source` configuration are not part of the resolve response,
        // so read the mapping and settings for concrete open indices. This is best-effort: if they
        // cannot be read (e.g. missing `view_index_metadata`) we leave the flags false and let the
        // save-time error handle it, rather than blocking a potentially valid edit.
        let routingRequired = false;
        let sourceDisabled = false;
        let sourceSynthetic = false;
        let runtimeFields: string[] = [];
        if (kind === 'index' && !closed) {
          try {
            const getResponse = await client.indices.get({
              index: indexName,
              features: ['mappings', 'settings'],
            });
            const indexState = Object.values(getResponse)[0];
            const sourceField = indexState?.mappings?._source;
            // Synthetic/disabled source can come from the mapping (`_source.mode`/`enabled`) or,
            // on recent versions, the `index.mapping.source.mode` setting.
            const settingSourceMode = indexState?.settings?.index?.mapping?.source?.mode;

            routingRequired = indexState?.mappings?._routing?.required === true;
            sourceDisabled =
              sourceField?.enabled === false ||
              sourceField?.mode === 'disabled' ||
              settingSourceMode === 'disabled';
            sourceSynthetic =
              sourceField?.mode === 'synthetic' || settingSourceMode === 'synthetic';
            // Runtime fields are computed at query time, so edits to them never persist. They are a
            // per-field concern (the rest of the index stays editable), so the editor renders just
            // these columns read-only rather than blocking the whole index.
            runtimeFields = Object.keys(indexState?.mappings?.runtime ?? {});
          } catch (metadataError) {
            const message =
              metadataError instanceof Error ? metadataError.message : String(metadataError);
            logger.get().debug(`Failed to read metadata for index "${indexName}": ${message}`, {
              tags: ['esql', 'index_editor', 'resolve'],
            });
          }
        }

        const resolution: IndexEditorResolution = {
          kind,
          mode: index?.mode,
          closed,
          frozen: attributes.includes('frozen'),
          routingRequired,
          sourceDisabled,
          sourceSynthetic,
          runtimeFields,
        };

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.resolve',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({ body: resolution });
      } catch (error) {
        const statusCode = getErrorStatusCode(error);
        // A missing name is a valid, successful answer: the name is free and can be created.
        if (statusCode === 404) {
          esqlRouteRequestCounter.add(1, {
            route: 'index_editor.resolve',
            outcome: 'success',
            'http.response.status_code': 200,
          });
          const resolution: IndexEditorResolution = {
            kind: 'none',
            closed: false,
            frozen: false,
            routingRequired: false,
            sourceDisabled: false,
            sourceSynthetic: false,
            runtimeFields: [],
          };
          return response.ok({ body: resolution });
        }

        esqlRouteRequestCounter.add(1, {
          route: 'index_editor.resolve',
          outcome: 'failure',
          'http.response.status_code': statusCode,
        });
        const message = error instanceof Error ? error.message : String(error);
        logger.get().debug(`Failed to resolve index "${indexName}": ${message}`, {
          tags: ['esql', 'index_editor', 'resolve'],
        });
        throw error;
      }
    }
  );
};
