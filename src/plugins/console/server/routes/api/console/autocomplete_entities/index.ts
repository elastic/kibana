/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import http from 'http';
import https from 'https';
import Boom from '@hapi/boom';
import { RouteDependencies } from '../../..';
import { sanitizeHostname } from '../../../../lib/utils';

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
      const legacyConfig = await deps.proxy.readLegacyESConfig();
      const { hosts } = legacyConfig;
      const path = request.url.searchParams.get('path');
      let body;

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
          body = await new Promise<string>((resolve, reject) => {
            const req = client.request(options, (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk) => {
                chunks.push(chunk);

                // Limit the size of the response to 10MB
                if (Buffer.byteLength(Buffer.concat(chunks)) > 10 * 1024 * 1024) {
                  req.destroy();
                  reject(Boom.badRequest('Response size is too large'));
                }
              });
              res.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
              });
            });
            req.on('error', reject);
            req.end();
          });
          break;
        } catch (err) {
          if (idx === hosts.length - 1) {
            return response.customError({
              statusCode: 500,
              body: err,
            });
          }
          // Try the next host
        }
      }

      return response.ok({
        body,
      });
    }
  );
};
