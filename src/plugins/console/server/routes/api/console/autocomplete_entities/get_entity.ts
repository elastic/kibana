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
import Boom from '@hapi/boom';
import { sanitizeHostname } from '../../../../lib/utils';
import { getRequestConfig, getProxyHeaders } from '../proxy/create_handler';
import type { Config } from '.';

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
// Limit the response size to 10MB, because the response can be very large and sending it to the client
// can cause the browser to hang.

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
export const getEntity = (path: string, config: Config) => {
  return new Promise((resolve, reject) => {
    const { hosts, kibanaVersion } = config;
    for (let idx = 0; idx < hosts.length; idx++) {
      const host = hosts[idx];
      const uri = new URL(host + path);
      const { protocol, hostname, port } = uri;
      const { headers, agent } = getRequestConfig(
        config.request.headers,
        config,
        uri.toString(),
        kibanaVersion,
        config.proxyConfigCollection
      );
      const proxyHeaders = getProxyHeaders(config.request);
      const client = protocol === 'https:' ? https : http;
      const requestHeaders = {
        ...headers,
        ...proxyHeaders,
        'x-elastic-product-origin': 'kibana', // This header is used to identify the origin of the request. It is used to filter out deprecation logs.
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
      };
      const hasHostHeader = Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'host');
      if (!hasHostHeader) {
        // If the user didn't specify a host header, we need to set one so that the request
        // doesn't get rejected by Elasticsearch.
        requestHeaders.host = hostname;
      }
      const options = {
        method: 'GET',
        headers: requestHeaders,
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
