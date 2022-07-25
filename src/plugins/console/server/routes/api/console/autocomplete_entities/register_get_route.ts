/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IScopedClusterClient } from '@kbn/core/server';
import { parse } from 'query-string';
import type { RouteDependencies } from '../../..';
import { API_BASE_PATH } from '../../../../../common/constants';

interface Settings {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

async function getMappings(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.fields) {
    return esClient.asInternalUser.indices.getMapping();
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return Promise.resolve({});
}

async function getAliases(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.indices) {
    return esClient.asInternalUser.indices.getAlias();
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return Promise.resolve({});
}

async function getDataStreams(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.dataStreams) {
    return esClient.asInternalUser.indices.getDataStream();
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return Promise.resolve({});
}

async function getTemplates(esClient: IScopedClusterClient, settings: Settings) {
  if (settings.templates) {
    return Promise.all([
      esClient.asInternalUser.indices.getTemplate(),
      esClient.asInternalUser.indices.getIndexTemplate(),
      esClient.asInternalUser.cluster.getComponentTemplate(),
    ]);
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return Promise.resolve([]);
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
        const mappings = await getMappings(esClient, settings);
        const aliases = await getAliases(esClient, settings);
        const dataStreams = await getDataStreams(esClient, settings);
        const [legacyTemplates = {}, indexTemplates = {}, componentTemplates = {}] =
          await getTemplates(esClient, settings);

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
