/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Lifecycle,
  Request,
  ResponseObject,
  ResponseToolkit as HapiResponseToolkit,
} from '@hapi/hapi';
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
import { HapiResponseAdapter, CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

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
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPreResponseFormat(fn: OnPreResponseHandler, log: Logger) {
  return async function interceptPreResponse(
    request: Request,
    responseToolkit: HapiResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const response = request.response;

    try {
      if (response) {
        const statusCode: number = isBoom(response)
          ? response.output.statusCode
          : response.statusCode;

        const result = await fn(CoreKibanaRequest.from(request), { statusCode }, toolkit);

        if (preResponseResult.isNext(result)) {
          if (result.headers) {
            if (isBoom(response)) {
              findHeadersIntersection(
                response.output.headers as { [key: string]: string },
                result.headers,
                log
              );
              // hapi wraps all error response in Boom object internally
              response.output.headers = {
                ...response.output.headers,
                ...(result.headers as any), // hapi types don't specify string[] as valid value
              };
            } else {
              findHeadersIntersection(response.headers, result.headers, log);
              setHeaders(response, result.headers);
            }
          }
        } else if (preResponseResult.isRender(result)) {
          const overriddenResponse = responseToolkit.response(result.body).code(statusCode);
          const originalHeaders = isBoom(response) ? response.output.headers : response.headers;
          setHeaders(overriddenResponse, originalHeaders as { [key: string]: string });
          if (result.headers) {
            setHeaders(overriddenResponse, result.headers);
          }

          return overriddenResponse;
        } else {
          throw new Error(
            `Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: ${result}.`
          );
        }
      }
    } catch (error) {
      log.error(error);
      const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
      return hapiResponseAdapter.toInternalError();
    }
    return responseToolkit.continue;
  };
}

function isBoom(response: any): response is Boom.Boom {
  return response instanceof Boom.Boom;
}

function setHeaders(response: ResponseObject, headers: ResponseHeaders) {
  for (const [headerName, headerValue] of Object.entries(headers)) {
    response.header(headerName, headerValue as any); // hapi types don't specify string[] as valid value
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
