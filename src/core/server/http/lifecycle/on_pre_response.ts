/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  Lifecycle,
  Request,
  ResponseObject,
  ResponseToolkit as HapiResponseToolkit,
} from '@hapi/hapi';
import Boom from '@hapi/boom';
import { Logger } from '../../logging';

import { HapiResponseAdapter, KibanaRequest, ResponseHeaders } from '../router';

enum ResultType {
  render = 'render',
  next = 'next',
}

interface Render {
  type: ResultType.render;
  body: string;
  headers?: ResponseHeaders;
}

interface Next {
  type: ResultType.next;
  headers?: ResponseHeaders;
}

/**
 * @internal
 */
type OnPreResponseResult = Render | Next;

/**
 * Additional data to extend a response when rendering a new body
 * @public
 */
export interface OnPreResponseRender {
  /** additional headers to attach to the response */
  headers?: ResponseHeaders;
  /** the body to use in the response */
  body: string;
}

/**
 * Additional data to extend a response.
 * @public
 */
export interface OnPreResponseExtensions {
  /** additional headers to attach to the response */
  headers?: ResponseHeaders;
}

/**
 * Response status code.
 * @public
 */
export interface OnPreResponseInfo {
  statusCode: number;
}

const preResponseResult = {
  render(responseRender: OnPreResponseRender): OnPreResponseResult {
    return { type: ResultType.render, body: responseRender.body, headers: responseRender?.headers };
  },
  isRender(result: OnPreResponseResult): result is Render {
    return result && result.type === ResultType.render;
  },
  next(responseExtensions?: OnPreResponseExtensions): OnPreResponseResult {
    return { type: ResultType.next, headers: responseExtensions?.headers };
  },
  isNext(result: OnPreResponseResult): result is Next {
    return result && result.type === ResultType.next;
  },
};

/**
 * A tool set defining an outcome of OnPreResponse interceptor for incoming request.
 * @public
 */
export interface OnPreResponseToolkit {
  /** To override the response with a different body */
  render: (responseRender: OnPreResponseRender) => OnPreResponseResult;
  /** To pass request to the next handler */
  next: (responseExtensions?: OnPreResponseExtensions) => OnPreResponseResult;
}

const toolkit: OnPreResponseToolkit = {
  render: preResponseResult.render,
  next: preResponseResult.next,
};

/**
 * See {@link OnPreRoutingToolkit}.
 * @public
 */
export type OnPreResponseHandler = (
  request: KibanaRequest,
  preResponse: OnPreResponseInfo,
  toolkit: OnPreResponseToolkit
) => OnPreResponseResult | Promise<OnPreResponseResult>;

/**
 * @public
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

        const result = await fn(KibanaRequest.from(request), { statusCode }, toolkit);

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
