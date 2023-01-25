/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import http from 'http';
import https from 'https';
import { Buffer } from 'buffer';
import { parse } from 'query-string';
import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SemVer } from 'semver';
import type { RouteDependencies } from '../../..';
import { sanitizeHostname } from '../../../../lib/utils';
import type { ESConfigForProxy } from '../../../../types';
import { getRequestConfig, getProxyHeaders } from '../proxy/create_handler';

interface SettingsToRetrieve {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

type Config = ESConfigForProxy & { request: KibanaRequest } & { kibanaVersion: SemVer };

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
// Limit the response size to 10MB, because the response can be very large and sending it to the client
// can cause the browser to hang.

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

/**
 * Get the autocomplete suggestions for the given entity.
 * We are using the raw http request in this function to retrieve the entities instead of esClient because
 * the esClient does not handle large responses well. For example, the response size for
 * the mappings can be very large(> 1GB) and the esClient will throw an 'Invalid string length'
 * error when trying to parse the response. By using the raw http request, we can limit the
 * response size and avoid the error.
 * @param path  The path to the entity to retrieve. For example, '/_mapping' or '/_alias'.
 * @param config The configuration for the request.
 * @returns The entity retrieved from Elasticsearch.
 */
const getEntity = (path: string, config: Config) => {
  return new Promise((resolve, reject) => {
    const { hosts, kibanaVersion } = config;
    for (let idx = 0; idx < hosts.length; idx++) {
      const host = hosts[idx];
      const uri = new URL(host + path);
      const { protocol, hostname, port } = uri;
      const { headers, agent } = getRequestConfig(config.request.headers, config, uri.toString(), kibanaVersion);
      const proxyHeaders = getProxyHeaders(config.request);
      const client = protocol === 'https:' ? https : http;

      const requestHeaders = {
        ...headers,
        ...proxyHeaders,
      }

      const hasHostHeader = Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'host');
      if (!hasHostHeader) {
        requestHeaders['host'] = hostname;
      }

      const options = {
        method: 'GET',
        headers: {
          ...requestHeaders,
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
        },
        host: sanitizeHostname(hostname),
        port: port === '' ? undefined : parseInt(port, 10),
        protocol,
        path: `${path}?pretty=false`, // add pretty=false to compress the response by removing whitespace
        agent,
      };

      try {
        const req = client.request(options, (res) => {
          const chunks: Buffer[] = [];

          let currentLength = 0;

          res.on('data', (chunk) => {
            currentLength += Buffer.byteLength(chunk);

            chunks.push(chunk);

            // Destroy the request if the response is too large
            if (currentLength > MAX_RESPONSE_SIZE) {
              req.destroy();
              reject(Boom.badRequest(`Response size is too large for ${path}`));
            }
          });
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(body));
          });
        });
        req.on('error', reject);
        req.end();
        break;
      } catch (err) {
        if (idx === hosts.length - 1) {
          reject(err);
        }
        // Try the next host
      }
    }
  });
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
      const configWithHeaders = {
        ...legacyConfig,
        request,
        kibanaVersion: deps.kibanaVersion,
      };

      // Wait for all requests to complete, in case one of them fails return the successfull ones
      const results = await Promise.allSettled([
        getMappings(settings, configWithHeaders),
        getAliases(settings, configWithHeaders),
        getDataStreams(settings, configWithHeaders),
        getLegacyTemplates(settings, configWithHeaders),
        getIndexTemplates(settings, configWithHeaders),
        getComponentTemplates(settings, configWithHeaders),
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
