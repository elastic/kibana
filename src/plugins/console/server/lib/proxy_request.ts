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
import { URL, URLSearchParams } from 'url';
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

/**
 * Node http request library does not expect there to be trailing "[" or "]"
 * characters in ipv6 host names.
 */
const sanitizeHostname = (hostName: string): string =>
  hostName.trim().replace(/^\[/, '').replace(/\]$/, '');

/**
 * Node URL percent-encodes any invalid characters in the pathname which results a 400 bad request error.
 * We need to decode the percent-encoded pathname, and encode it correctly with encodeURIComponent
 */

export const encodePathname = (pathname: string) => {
  const decodedPath = new URLSearchParams(`path=${pathname}`).get('path') ?? '';

  // Skip if it is valid
  if (pathname === decodedPath) {
    return pathname;
  }

  return `/${encodeURIComponent(trimStart(decodedPath, '/'))}`;
};

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
  const { hostname, port, protocol, pathname, search } = uri;
  const client = uri.protocol === 'https:' ? https : http;
  const encodedPath = encodePathname(pathname);
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
    path: `${encodedPath}${search || ''}`,
    headers: {
      ...finalUserHeaders,
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    },
    agent,
  });

  req.once('response', (res) => {
    resolved = true;
    resolve(res);
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
      if (!req.aborted && !req.socket) req.abort();
      if (!resolved) {
        timeoutReject(Boom.gatewayTimeout('Client request timeout'));
      } else {
        timeoutResolve(undefined);
      }
    }, timeout);
  });

  return Promise.race<http.IncomingMessage>([reqPromise, timeoutPromise]);
};
