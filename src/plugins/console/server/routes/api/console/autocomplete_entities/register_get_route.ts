/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IScopedClusterClient } from '@kbn/core/server';
import { parse } from 'query-string';
import type { IncomingMessage } from 'http';
import type { RouteDependencies } from '../../..';
import { API_BASE_PATH } from '../../../../../common/constants';
import { streamToJSON } from '../../../../lib/utils';

interface Settings {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

const RESPONSE_SIZE_LIMIT = 10 * 1024 * 1024;
// Limit the response size to 10MB, because the response can be very large and sending it to the client
// can cause the browser to hang.

async function getMappings(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.fields) {
    const stream = await esClient.asInternalUser.indices.getMapping(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

async function getAliases(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.indices) {
    const stream = await esClient.asInternalUser.indices.getAlias(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

async function getDataStreams(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.dataStreams) {
    const stream = await esClient.asInternalUser.indices.getDataStream(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

async function getLegacyTemplates(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.templates) {
    const stream = await esClient.asInternalUser.indices.getTemplate(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

async function getComponentTemplates(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.templates) {
    const stream = await esClient.asInternalUser.cluster.getComponentTemplate(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

async function getIndexTemplates(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.templates) {
    const stream = await esClient.asInternalUser.indices.getIndexTemplate(undefined, {
      asStream: true,
    });
    return streamToJSON(stream as unknown as IncomingMessage, RESPONSE_SIZE_LIMIT);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
}

export function registerGetRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/autocomplete_entities`,
      validate: false,
    },
    async (ctx, request, response) => {
      try {
        const settings = parse(request.url.search, { parseBooleans: true }) as unknown as Settings;

        // If no settings are provided return 400
        if (Object.keys(settings).length === 0) {
          return response.badRequest({
            body: 'Request must contain a query param of autocomplete settings',
          });
        }

        const esClient = (await ctx.core).elasticsearch.client;

        // Wait for all requests to complete, in case one of them fails return the successfull ones
        const results = await Promise.allSettled([
          getMappings(esClient, settings),
          getAliases(esClient, settings),
          getDataStreams(esClient, settings),
          getLegacyTemplates(esClient, settings),
          getIndexTemplates(esClient, settings),
          getComponentTemplates(esClient, settings),
        ]);

        const [
          mappings,
          aliases,
          dataStreams,
          legacyTemplates,
          indexTemplates,
          componentTemplates,
        ] = results.map((result) => {
          // If the request was successful, return the result
          if (result.status === 'fulfilled') {
            return result.value;
          }
          // If the request failed, return an empty object
          return {};
        });

        return response.ok({
          body: {
            mappings,
            aliases,
            dataStreams,
            legacyTemplates,
            indexTemplates,
            componentTemplates,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    }
  );
}
