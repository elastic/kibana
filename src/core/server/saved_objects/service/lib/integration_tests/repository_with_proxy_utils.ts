/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Hapi from '@hapi/hapi';
import { IncomingMessage } from 'http';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/dev-utils';
import type { getEnvOptions as getEnvOptionsTyped } from '@kbn/config/target_types/mocks';
import {
  getEnvOptions as getEnvOptionsNonTyped,
  // @ts-expect-error
} from '@kbn/config/target_node/mocks';

// Inspired by src/core/server/ui_settings/integration_tests/index.test.ts
// we need the current kibana version to target the specific .kibana_<version> index for routes that need the active kibana index
const getEnvOptions: typeof getEnvOptionsTyped = getEnvOptionsNonTyped;
const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const kbnIndex = `.kibana_${kibanaVersion}`;

// proxy setup
const defaultProxyOptions = (hostname: string, port: number | string) => ({
  host: hostname,
  port,
  protocol: 'http' as 'http',
  passThrough: true,
});

let proxyInterrupt: string | null | undefined = null;

export const setProxyInterrupt = (testArg: string | null) => (proxyInterrupt = testArg);
export const getProxyInterrupt = () => proxyInterrupt;

const relayHandler = (h: Hapi.ResponseToolkit, hostname: string, port: number | string) => {
  return h.proxy({ ...defaultProxyOptions(hostname, port) });
};

const proxyResponseHandler = (h: Hapi.ResponseToolkit, hostname: string, port: number | string) => {
  return h.proxy({
    ...defaultProxyOptions(hostname, port),
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onResponse: async (err, res, request, h, settings, ttl) => proxyOnResponseHandler(res, h),
  });
};
const proxyOnResponseHandler = async (res: IncomingMessage, h: Hapi.ResponseToolkit) => {
  return h
    .response(res)
    .header('x-elastic-product', 'somethingitshouldnotbe', { override: true })
    .code(404);
};
// GET /.kibana_8.0.0/_doc/{type*} route (repository.get calls)
export const declareGetRoute = (hapiServer: Hapi.Server, hostname: string, port: string | number) =>
  hapiServer.route({
    method: 'GET',
    path: `/${kbnIndex}/_doc/{type*}`,
    options: {
      handler: (req, h) => {
        // mimics a 404 'unexpected' response from the proxy for specific docs
        if (req.params.type === 'my_type:myTypeId1' || req.params.type === 'my_type:myType_123') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// DELETE /.kibana_8.0.0/_doc/{type*} route (repository.delete calls)
export const declareDeleteRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
  hapiServer.route({
    method: 'DELETE',
    path: `/${kbnIndex}/_doc/{_id*}`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        // mimic a not found from proxy
        if (req.params._id === 'my_type:myTypeId1') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });

// POST _bulk route
export const declarePostBulkRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
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
export const declarePostMgetRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
  hapiServer.route({
    method: 'POST',
    path: '/_mget',
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        if (proxyInterrupt === 'bulkGetMyType' || proxyInterrupt === 'checkConficts') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// GET _search route
export const declareGetSearchRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
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
export const declarePostSearchRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
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
          // TODO: improve on this
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _update
export const declarePostUpdateRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_update/{_id*}`, // I only want to match on part of a param
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        // mimics a 404 'unexpected' response from the proxy
        if (req.params._id === 'my_type:myTypeToUpdate') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });
// POST _pit
export const declarePostPitRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
  hapiServer.route({
    method: 'POST',
    path: `/${kbnIndex}/_pit`,
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
      handler: (req, h) => {
        // mimics a 404 'unexpected' response from the proxy
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
  port: string | number
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
        // mimics a 404 'unexpected' response from the proxy
        if (proxyInterrupt === 'deleteByNamespace') {
          return proxyResponseHandler(h, hostname, port);
        } else {
          return relayHandler(h, hostname, port);
        }
      },
    },
  });

// catch-all passthrough route
export const declarePassthroughRoute = (
  hapiServer: Hapi.Server,
  hostname: string,
  port: string | number
) =>
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
