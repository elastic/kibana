/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyReply, onSendAsyncHookHandler } from 'fastify';
import Boom from '@hapi/boom';
import type { Logger } from '@kbn/logging';
import type {
  ResponseHeaders,
  OnPreResponseRender,
  OnPreResponseResult,
  OnPreResponseToolkit,
  OnPreResponseResultRender,
  OnPreResponseResultNext,
  OnPreResponseExtensions,
  OnPreResponseHandler,
} from '@kbn/core-http-server';
import { OnPreResponseResultType } from '@kbn/core-http-server';
import { FastifyResponseAdapter, CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

const preResponseResult = {
  render(responseRender: OnPreResponseRender): OnPreResponseResult {
    return {
      type: OnPreResponseResultType.render,
      body: responseRender.body,
      headers: responseRender?.headers,
    };
  },
  isRender(result: OnPreResponseResult): result is OnPreResponseResultRender {
    return result && result.type === OnPreResponseResultType.render;
  },
  next(responseExtensions?: OnPreResponseExtensions): OnPreResponseResult {
    return { type: OnPreResponseResultType.next, headers: responseExtensions?.headers };
  },
  isNext(result: OnPreResponseResult): result is OnPreResponseResultNext {
    return result && result.type === OnPreResponseResultType.next;
  },
};

const toolkit: OnPreResponseToolkit = {
  render: preResponseResult.render,
  next: preResponseResult.next,
};

/**
 * Adopt custom request interceptor to Fastify lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToFastifyOnPreResponseFormat(
  fn: OnPreResponseHandler,
  log: Logger
): onSendAsyncHookHandler<any> {
  // TODO: Figure out the generic type for `payload` instead of just setting it to `any`
  return async function interceptPreResponse(request, reply, payload) {
    // TODO: Shouldn't we use the payload??
    try {
      const statusCode: number = isBoom(reply) ? reply.output.statusCode : reply.statusCode;

      const result = await fn(CoreKibanaRequest.from(request, reply), { statusCode }, toolkit);

      if (preResponseResult.isNext(result)) {
        if (result.headers) {
          if (isBoom(reply)) {
            findHeadersIntersection(reply.output.headers, result.headers, log);
            // hapi wraps all error response in Boom object internally
            reply.output.headers = {
              ...reply.output.headers,
              ...result.headers,
            };
          } else {
            findHeadersIntersection(reply.getHeaders(), result.headers, log);
            setHeaders(reply, result.headers);
          }
        }
      } else if (preResponseResult.isRender(result)) {
        const overriddenResponse = reply.send(result.body).code(statusCode);

        const originalHeaders = isBoom(reply) ? reply.output.headers : reply.getHeaders();
        setHeaders(overriddenResponse, originalHeaders);
        if (result.headers) {
          setHeaders(overriddenResponse, result.headers);
        }
      } else {
        throw new Error(
          `Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: ${result}.`
        );
      }
    } catch (error) {
      log.error(error);
      const fastifyResponseAdapter = new FastifyResponseAdapter(reply);
      throw fastifyResponseAdapter.toInternalError();
    }
  };
}

function isBoom(response: any): response is Boom.Boom {
  return response instanceof Boom.Boom;
}

function setHeaders(reply: FastifyReply, headers: ResponseHeaders) {
  for (const [headerName, headerValue] of Object.entries(headers)) {
    reply.header(headerName, headerValue);
  }
}

// NOTE: responseHeaders contains not a full list of response headers, but only explicitly set on a response object.
// any headers added by hapi internally, like `content-type`, `content-length`, etc. are not present here.
function findHeadersIntersection(
  responseHeaders: ResponseHeaders,
  headers: ResponseHeaders,
  log: Logger
) {
  Object.keys(headers).forEach((headerName) => {
    if (Reflect.has(responseHeaders, headerName)) {
      log.warn(`onPreResponseHandler rewrote a response header [${headerName}].`);
    }
  });
}
