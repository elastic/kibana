/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  ClusterGetComponentTemplateResponse,
  IndicesGetAliasResponse,
  IndicesGetDataStreamResponse,
  IndicesGetIndexTemplateResponse,
  IndicesGetMappingResponse,
  IndicesGetTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { parse } from 'query-string';
import type { RouteDependencies } from '../../..';
import { API_BASE_PATH } from '../../../../../common/constants';

export interface Settings {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

async function retrieveSettings(
  esClient: IScopedClusterClient,
  settingsKey: keyof Settings,
  settings: Settings
): Promise<
  | IndicesGetMappingResponse
  | IndicesGetAliasResponse
  | IndicesGetDataStreamResponse
  | [
      IndicesGetTemplateResponse,
      IndicesGetIndexTemplateResponse,
      ClusterGetComponentTemplateResponse
    ]
  | void
> {
  // Fetch autocomplete info if setting is set to true, and if user has made changes.
  if (settings[settingsKey]) {
    switch (settingsKey) {
      case 'indices':
        return esClient.asInternalUser.indices.getAlias();
      case 'fields':
        return esClient.asInternalUser.indices.getMapping();
      case 'dataStreams':
        return esClient.asInternalUser.indices.getDataStream();
      case 'templates':
        return Promise.all([
          esClient.asInternalUser.indices.getTemplate(),
          esClient.asInternalUser.indices.getIndexTemplate(),
          esClient.asInternalUser.cluster.getComponentTemplate(),
        ]);
      default:
        return Promise.resolve({});
    }
  } else {
    if (!settings[settingsKey]) {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve({});
    } else {
      return Promise.resolve();
    }
  }
}

async function getMappings(esClient: IScopedClusterClient, settings: Settings) {
  return await retrieveSettings(esClient, 'fields', settings);
}

async function getAliases(esClient: IScopedClusterClient, settings: Settings) {
  return await retrieveSettings(esClient, 'indices', settings);
}

async function getDataStreams(esClient: IScopedClusterClient, settings: Settings) {
  return await retrieveSettings(esClient, 'dataStreams', settings);
}

async function getTemplates(esClient: IScopedClusterClient, settings: Settings) {
  return await retrieveSettings(esClient, 'templates', settings);
}

export function registerGetRoute({ router }: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/mappings`,
      validate: false,
    },
    async (ctx, request, response) => {
      try {
        const settings = parse(request.url.search, { parseBooleans: true }) as unknown as Settings;
        const esClient = (await ctx.core).elasticsearch.client;

        const mappings = await getMappings(esClient, settings);
        const aliases = await getAliases(esClient, settings);
        const dataStreams = await getDataStreams(esClient, settings);
        const templates = await getTemplates(esClient, settings);

        return response.ok({
          body: {
            mappings,
            aliases,
            dataStreams,
            templates,
          },
        });
      } catch (e) {
        throw e;
      }
    }
  );
}
