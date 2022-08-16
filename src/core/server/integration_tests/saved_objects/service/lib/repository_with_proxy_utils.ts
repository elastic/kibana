/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { kibanaPackageJson as pkg } from '@kbn/utils';

// proxy setup
const defaultProxyOptions = (hostname: string, port: string) => ({
  host: hostname,
  port,
  protocol: 'http' as 'http',
  // passThrough: true, // TODO: Is this the default with Fastify
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

interface IdParams {
  _id: string;
}

interface TypeParams {
  type: string;
}

// passes the req/response directly as is
const relayHandler = (reply: FastifyReply, hostname: string, port: string) => {
  return reply.from('/', {
    getUpstream(req, base) {
      return url.format(defaultProxyOptions(hostname, port));
    },
  });
};

const proxyResponseHandler = (reply: FastifyReply, hostname: string, port: string) => {
  return reply.from('/', {
    getUpstream(req, base) {
      return url.format(defaultProxyOptions(hostname, port));
    },
    // mimics a 404 'unexpected' response from the proxy
    onResponse(request, _reply, res) {
      return _reply.send(res).header('x-elastic-product', 'somethingitshouldnotbe').code(404);
    },
  });
};

const kbnIndex = `.kibana_${pkg.version}`;

// GET /.kibana_8.0.0/_doc/{type*} route (repository.get calls)
export const declareGetRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.get<{ Params: TypeParams }>(`/${kbnIndex}/_doc/{type*}`, (request, reply) => {
    if (
      request.params.type === 'my_type:myTypeId1' ||
      request.params.type === 'my_type:myType_123'
    ) {
      return proxyResponseHandler(reply, hostname, port);
    } else {
      return relayHandler(reply, hostname, port);
    }
  });
// DELETE /.kibana_8.0.0/_doc/{type*} route (repository.delete calls)
export const declareDeleteRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.delete<{ Params: IdParams }>(
    `/${kbnIndex}/_doc/{_id*}`,
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (request.params._id === 'my_type:myTypeId1') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );

// POST _bulk route
export const declarePostBulkRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.post(
    '/_bulk',
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (proxyInterrupt === 'bulkCreate') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );
// POST _mget route (repository.bulkGet calls)
export const declarePostMgetRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.post(
    '/_mget',
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (
        proxyInterrupt === 'bulkGetMyType' ||
        proxyInterrupt === 'checkConficts' ||
        proxyInterrupt === 'internalBulkResolve'
      ) {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );
// GET _search route
export const declareGetSearchRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.get(`/${kbnIndex}/_search`, (request, reply) => {
    const payload = request.body;
    if (!payload) {
      return proxyResponseHandler(reply, hostname, port);
    } else {
      return relayHandler(reply, hostname, port);
    }
  });
// POST _search route (`find` calls)
export const declarePostSearchRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.post(
    `/${kbnIndex}/_search`,
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (proxyInterrupt === 'find') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );
// POST _update
export const declarePostUpdateRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.post<{ Params: IdParams }>(
    `/${kbnIndex}/_update/{_id*}`,
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (request.params._id === 'my_type:myTypeToUpdate') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );
// POST _pit
export const declarePostPitRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.post(
    `/${kbnIndex}/_pit`,
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (proxyInterrupt === 'openPit') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );
// POST _update_by_query
export const declarePostUpdateByQueryRoute = (
  server: FastifyInstance,
  hostname: string,
  port: string
) =>
  server.post(
    `/${kbnIndex}/_update_by_query`,
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      if (proxyInterrupt === 'deleteByNamespace') {
        return proxyResponseHandler(reply, hostname, port);
      } else {
        return relayHandler(reply, hostname, port);
      }
    }
  );

// catch-all passthrough route
export const declarePassthroughRoute = (server: FastifyInstance, hostname: string, port: string) =>
  server.all(
    '/{any*}',
    // {
    //   payload: {
    //     output: 'data',
    //     parse: false,
    //   },
    // },
    (request, reply) => {
      return relayHandler(reply, hostname, port);
    }
  );
