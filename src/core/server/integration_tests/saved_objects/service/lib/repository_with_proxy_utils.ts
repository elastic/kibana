/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Hapi from '@hapi/hapi';
import { IncomingMessage } from 'http';
import { kibanaPackageJson as pkg } from '@kbn/utils';

// proxy setup
const defaultProxyOptions = (hostname: string, port: string) => ({
  host: hostname,
  port,
  protocol: 'http' as 'http',
  passThrough: true,
});

let proxyInterrupt: string | null | undefined = null;

export const setProxyInterrupt = (
  testArg:
    | 'bulkCreate'
    | 'bulkGetMyType'
    | 'checkConficts'
    | 'find'
    | 'openPit'
    | 'deleteByNamespace'
    | 'internalBulkResolve'
    | null
) => (proxyInterrupt = testArg);

// passes the req/response directly as is
const relayHandler = (h: Hapi.ResponseToolkit, hostname: string, port: string) => {
  return h.proxy(defaultProxyOptions(hostname, port));
};

const proxyResponseHandler = (h: Hapi.ResponseToolkit, hostname: string, port: string) => {
  return h.proxy({
    ...defaultProxyOptions(hostname, port),
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onResponse: async (err, res, request, h, settings, ttl) => proxyOnResponseHandler(res, h),
  });
};

// mimics a 404 'unexpected' response from the proxy
const proxyOnResponseHandler = async (res: IncomingMessage, h: Hapi.ResponseToolkit) => {
  return h
    .response(res)
    .header('x-elastic-product', 'somethingitshouldnotbe', { override: true })
    .code(404);
};

const kbnIndex = `.kibana_${pkg.version}`;

// GET /.kibana_8.0.0/_doc/{type*} route (repository.get calls)
export const declareGetRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'GET',
    path: `/${kbnIndex}/_doc/{type*}`,
    options: {
      handler: (req, h) => {
        if (req.params.type === 'my_type:myTypeId1' || req.params.type === 'my_type:myType_123') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// DELETE /.kibana_8.0.0/_doc/{type*} route (repository.delete calls)
export const declareDeleteRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'DELETE',
    path: `/${kbnIndex}/_doc/{_id*}`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (req.params._id === 'my_type:myTypeId1') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });

// POST _bulk route
export const declarePostBulkRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'POST',
    path: '/_bulk',
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (proxyInterrupt === 'bulkCreate') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _mget route (repository.bulkGet calls)
export const declarePostMgetRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'POST',
    path: '/_mget',
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (
          proxyInterrupt === 'bulkGetMyType' ||
          proxyInterrupt === 'checkConficts' ||
          proxyInterrupt === 'internalBulkResolve'
        ) {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// GET _search route
export const declareGetSearchRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'GET',
    path: `/${kbnIndex}/_search`,
    options: {
      handler: (req, h) => {
        const payload = req.payload;
        if (!payload) {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _search route (`find` calls)
export const declarePostSearchRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_search`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (proxyInterrupt === 'find') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _update
export const declarePostUpdateRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_update/{_id*}`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (req.params._id === 'my_type:myTypeToUpdate') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _pit
export const declarePostPitRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_pit`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (proxyInterrupt === 'openPit') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _update_by_query
export const declarePostUpdateByQueryRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string
) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_update_by_query`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (proxyInterrupt === 'deleteByNamespace') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });

// catch-all passthrough route
export const declarePassthroughRoute = (hapiServer: Hapi.Server, hostname: string, port: string) =>
  hapiServer.route({
    method: '*',
    path: '/{any*}',
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        return relayHandler(h, hostname, port);
      },
    },
  });
