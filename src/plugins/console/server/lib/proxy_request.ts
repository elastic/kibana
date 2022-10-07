/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import http from 'http';
import https from 'https';
import net from 'net';
import stream from 'stream';
import Boom from '@hapi/boom';
import { URL } from 'url';
import { trimStart } from 'lodash';

interface Args {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  agent: http.Agent;
  uri: URL;
  payload: stream.Stream;
  timeout: number;
  headers: http.OutgoingHttpHeaders;
  rejectUnauthorized?: boolean;
}

const MAX_MAPPING_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const isMappingEndpoint = (pathname: string): boolean => trimStart(pathname, '/') === '_mapping';

/**
 * Node http request library does not expect there to be trailing "[" or "]"
 * characters in ipv6 host names.
 */
const sanitizeHostname = (hostName: string): string =>
  hostName.trim().replace(/^\[/, '').replace(/\]$/, '');

// We use a modified version of Hapi's Wreck because Hapi, Axios, and Superagent don't support GET requests
// with bodies, but ES APIs do. Similarly with DELETE requests with bodies. Another library, `request`
// diverged too much from current behaviour.
export const proxyRequest = ({
  method,
  headers,
  agent,
  uri,
  timeout,
  payload,
  rejectUnauthorized,
}: Args) => {
  const { hostname, port, protocol, search, pathname } = uri;
  const client = uri.protocol === 'https:' ? https : http;

  let resolved = false;

  let resolve: (res: http.IncomingMessage) => void;
  let reject: (res: unknown) => void;
  const reqPromise = new Promise<http.IncomingMessage>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const finalUserHeaders = { ...headers };
  const hasHostHeader = Object.keys(finalUserHeaders).some((key) => key.toLowerCase() === 'host');
  if (!hasHostHeader) {
    finalUserHeaders.host = hostname;
  }

  const req = client.request({
    method: method.toUpperCase(),
    // We support overriding this on a per request basis to support legacy proxy config. See ./proxy_config.
    rejectUnauthorized: typeof rejectUnauthorized === 'boolean' ? rejectUnauthorized : undefined,
    host: sanitizeHostname(hostname),
    port: port === '' ? undefined : parseInt(port, 10),
    protocol,
    path: `${pathname}${search || ''}`,
    headers: {
      ...finalUserHeaders,
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    },
    agent,
  });

  req.once('response', (res) => {
    // Check if the request is to _mapping endpoint and if so, limit the response to 10MB. This is to
    // protect against large mapping responses that can cause the browser to hang.
    if (isMappingEndpoint(pathname)) {
      let responseSize = 0;
      // Transform stream that limits the size of the response. If the response is larger than the
      // MAX_MAPPING_RESPONSE_SIZE, the stream will emit an error.
      const limitedResponse = new stream.Transform({
        transform(chunk, encoding, callback) {
          responseSize += chunk.length;
          if (responseSize > MAX_MAPPING_RESPONSE_SIZE) {
            callback(Boom.badRequest('Maximum size of mappings response exceeded'));
          } else {
            callback(null, chunk);
          }
        },
      });

      const source = res.pipe(limitedResponse);
      source.on('error', (err) => {
        req.destroy();
        reject(err);
      });

      source.on('finish', () => {
        // we need to bind the pipe function to the new stream so that it can be used by consumers of the response stream
        res.pipe = limitedResponse.pipe.bind(limitedResponse);
        resolved = true;
        resolve(res);
      });
    } else {
      resolved = true;
      resolve(res);
    }
  });

  req.once('socket', (socket: net.Socket) => {
    if (!socket.connecting) {
      payload.pipe(req);
    } else {
      socket.once('connect', () => {
        payload.pipe(req);
      });
    }
  });

  const onError = (e: Error) => reject(e);
  req.once('error', onError);

  const timeoutPromise = new Promise<any>((timeoutResolve, timeoutReject) => {
    setTimeout(() => {
      // Destroy the stream on timeout and close the connection.
      if (!req.destroyed) {
        req.destroy();
      }
      if (!resolved) {
        timeoutReject(Boom.gatewayTimeout('Client request timeout'));
      } else {
        timeoutResolve(undefined);
      }
    }, timeout);
  });

  return Promise.race<http.IncomingMessage>([reqPromise, timeoutPromise]);
};
