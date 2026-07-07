/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { RouteDependencies } from '../../..';
import { autoCompleteEntitiesValidationConfig, type SettingsToRetrieve } from './validation_config';

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
// Limit the response size to 10MB, because the response can be very large and sending it to the client
// can cause the browser to hang.

const getMappings = async (settings: SettingsToRetrieve, esClient: IScopedClusterClient) => {
  if (settings.fields && settings.fieldsIndices) {
    const mappings = await esClient.asCurrentUser.indices.getMapping(
      {
        index: settings.fieldsIndices,
      },
      {
        maxResponseSize: MAX_RESPONSE_SIZE,
        maxCompressedResponseSize: MAX_RESPONSE_SIZE,
      }
    );
    return mappings;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getAliases = async (settings: SettingsToRetrieve, esClient: IScopedClusterClient) => {
  if (settings.indices) {
    const aliases = await esClient.asCurrentUser.indices.getAlias();
    return aliases;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getDataStreams = async (settings: SettingsToRetrieve, esClient: IScopedClusterClient) => {
  if (settings.dataStreams) {
    const dataStreams = await esClient.asCurrentUser.indices.getDataStream({
      name: '*',
      expand_wildcards: 'all',
    });
    return dataStreams;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getLegacyTemplates = async (settings: SettingsToRetrieve, esClient: IScopedClusterClient) => {
  if (settings.templates) {
    const legacyTemplates = await esClient.asCurrentUser.indices.getTemplate();
    return legacyTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getIndexTemplates = async (settings: SettingsToRetrieve, esClient: IScopedClusterClient) => {
  if (settings.templates) {
    const indexTemplates = await esClient.asCurrentUser.indices.getIndexTemplate();
    return indexTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getComponentTemplates = async (
  settings: SettingsToRetrieve,
  esClient: IScopedClusterClient
) => {
  if (settings.templates) {
    const componentTemplates = await esClient.asCurrentUser.cluster.getComponentTemplate();
    return componentTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

export const registerAutocompleteEntitiesRoute = (deps: RouteDependencies) => {
  deps.router.get(
    {
      path: '/api/console/autocomplete_entities',
      security: {
        authz: {
          requiredPrivileges: ['console'],
        },
      },
      validate: autoCompleteEntitiesValidationConfig,
    },
    async (context, request, response) => {
      const esClient = (await context.core).elasticsearch.client;
      const settings = request.query;

      // Wait for all requests to complete, in case one of them fails return the successfull ones
      const results = await Promise.allSettled([
        getMappings(settings, esClient),
        getAliases(settings, esClient),
        getDataStreams(settings, esClient),
        getLegacyTemplates(settings, esClient),
        getIndexTemplates(settings, esClient),
        getComponentTemplates(settings, esClient),
      ]);

      const [mappings, aliases, dataStreams, legacyTemplates, indexTemplates, componentTemplates] =
        results.map((result) => {
          // If the request was successful, return the result
          if (result.status === 'fulfilled') {
            return result.value;
          }

          // If the request failed, log the error and return an empty object
          if (result.reason instanceof Error) {
            deps.log.debug(`Failed to retrieve autocomplete suggestions: ${result.reason.message}`);
          }

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
    }
  );
};
