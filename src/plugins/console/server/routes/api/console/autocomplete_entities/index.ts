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
import type { RouteDependencies } from '../../..';
import { sanitizeHostname } from '../../../../lib/utils';
import type { ESConfigForProxy } from '../../../../types';

interface Settings {
  indices: boolean;
  fields: boolean;
  templates: boolean;
  dataStreams: boolean;
}

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
// Limit the response size to 10MB, because the response can be very large and sending it to the client
// can cause the browser to hang.

const getMappings = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.fields) {
    const mappings = await getEntity('/_mapping', config);
    return mappings;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getAliases = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.indices) {
    const aliases = await getEntity('/_alias', config);
    return aliases;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getDataStreams = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.dataStreams) {
    const dataStreams = await getEntity('/_data_stream', config);
    return dataStreams;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getLegacyTemplates = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.templates) {
    const legacyTemplates = await getEntity('/_template', config);
    return legacyTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getIndexTemplates = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.templates) {
    const indexTemplates = await getEntity('/_index_template', config);
    return indexTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getComponentTemplates = async (settings: Settings, config: ESConfigForProxy) => {
  if (settings.templates) {
    const componentTemplates = await getEntity('/_component_template', config);
    return componentTemplates;
  }
  // If the user doesn't want autocomplete suggestions, then clear any that exist.
  return {};
};

const getEntity = (path: string, config: ESConfigForProxy) => {
  return new Promise((resolve, reject) => {
    const { hosts } = config;
    for (let idx = 0; idx < hosts.length; idx++) {
      const host = hosts[idx];
      const { hostname, port, protocol } = new URL(host);
      const client = protocol === 'https:' ? https : http;
      const options = {
        method: 'GET',
        host: sanitizeHostname(hostname),
        port: port === '' ? undefined : parseInt(port, 10),
        protocol,
        path: `${path}?pretty=false`, // add pretty=false to compress the response by removing whitespace
      };

      try {
        const req = client.request(options, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => {
            chunks.push(chunk);

            // Destroy the request if the response is too large
            if (Buffer.byteLength(Buffer.concat(chunks)) > MAX_RESPONSE_SIZE) {
              req.destroy();
              reject(Boom.badRequest('Response size is too large'));
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
      const settings = parse(request.url.search, { parseBooleans: true }) as unknown as Settings;

      // If no settings are provided return 400
      if (Object.keys(settings).length === 0) {
        return response.badRequest({
          body: 'Request must contain a query param of autocomplete settings',
        });
      }

      const legacyConfig = await deps.proxy.readLegacyESConfig();

      // Wait for all requests to complete, in case one of them fails return the successfull ones
      const results = await Promise.allSettled([
        getMappings(settings, legacyConfig),
        getAliases(settings, legacyConfig),
        getDataStreams(settings, legacyConfig),
        getLegacyTemplates(settings, legacyConfig),
        getIndexTemplates(settings, legacyConfig),
        getComponentTemplates(settings, legacyConfig),
      ]);

      const [mappings, aliases, dataStreams, legacyTemplates, indexTemplates, componentTemplates] =
        results.map((result) => {
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
    }
  );
};
