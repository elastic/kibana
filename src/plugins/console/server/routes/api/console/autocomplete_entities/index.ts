/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'query-string';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SemVer } from 'semver';
import type { ProxyConfigCollection } from '../../../../lib';
import type { RouteDependencies } from '../../..';
import type { ESConfigForProxy } from '../../../../types';
import { getEntity } from './get_entity';

interface SettingsToRetrieve {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

export type Config = ESConfigForProxy & { request: KibanaRequest } & { kibanaVersion: SemVer } & {
  proxyConfigCollection?: ProxyConfigCollection;
};

const getMappings = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.fields) {
    const mappings = await getEntity('/_mapping', config);
    return mappings;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getAliases = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.indices) {
    const aliases = await getEntity('/_alias', config);
    return aliases;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getDataStreams = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.dataStreams) {
    const dataStreams = await getEntity('/_data_stream', config);
    return dataStreams;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getLegacyTemplates = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.templates) {
    const legacyTemplates = await getEntity('/_template', config);
    return legacyTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getIndexTemplates = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.templates) {
    const indexTemplates = await getEntity('/_index_template', config);
    return indexTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getComponentTemplates = async (settings: SettingsToRetrieve, config: Config) => {
  if (settings.templates) {
    const componentTemplates = await getEntity('/_component_template', config);
    return componentTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

export const registerAutocompleteEntitiesRoute = (deps: RouteDependencies) => {
  deps.router.get(
    {
      path: '/api/console/autocomplete_entities',
      options: {
        tags: ['access:console'],
      },
      validate: false,
    },
    async (context, request, response) => {
      const settings = parse(request.url.search, {
        parseBooleans: true,
      }) as unknown as SettingsToRetrieve;

      // If no settings are specified, then return 400.
      if (Object.keys(settings).length === 0) {
        return response.badRequest({
          body: 'Request must contain at least one of the following parameters: indices, fields, templates, dataStreams',
        });
      }

      const legacyConfig = await deps.proxy.readLegacyESConfig();
      const config = {
        ...legacyConfig,
        request,
        kibanaVersion: deps.kibanaVersion,
        proxyConfigCollection: deps.proxy.proxyConfigCollection,
      };

      // Wait for all requests to complete, in case one of them fails return the successfull ones
      const results = await Promise.allSettled([
        getMappings(settings, config),
        getAliases(settings, config),
        getDataStreams(settings, config),
        getLegacyTemplates(settings, config),
        getIndexTemplates(settings, config),
        getComponentTemplates(settings, config),
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
