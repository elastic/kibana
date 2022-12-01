/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ResponseObject as HapiResponseObject,
  ResponseToolkit as HapiResponseToolkit,
} from '@hapi/hapi';
import type { ReplyFileHandlerOptions } from '@hapi/inert';
import typeDetect from 'type-detect';
import Boom from '@hapi/boom';
import * as stream from 'stream';
import {
  ElasticsearchErrorDetails,
  isResponseError as isElasticsearchResponseError,
} from '@kbn/es-errors';
import { REPO_ROOT } from '@kbn/utils';
import { HttpResponsePayload, ResponseError, ResponseErrorAttributes } from '@kbn/core-http-server';
import { KibanaResponse } from './kibana_response/kibana_response';
import { KibanaFileResponse } from './kibana_response/kibana_file_response';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const FILE_COMPRESSION_LOOKUP_MAP: NonNullable<ReplyFileHandlerOptions['lookupMap']> = {
  br: '.br',
  gzip: '.gz',
};

function setHeaders(response: HapiResponseObject, headers: Record<string, string | string[]> = {}) {
  Object.entries(headers).forEach(([header, value]) => {
    if (value === undefined) {
      return;
    }

    if (header.toLowerCase() === 'etag') {
      response.etag(Array.isArray(value) ? value[0] : value);
    } else {
      // Hapi typings for header accept only strings, although string[] is a valid value
      response.header(header, value as any);
    }
  });

  return response;
}

const statusHelpers = {
  isSuccess: (code: number) => code >= 100 && code < 300,
  isRedirect: (code: number) => code >= 300 && code < 400,
  isError: (code: number) => code >= 400 && code < 600,
};

export class HapiResponseAdapter {
  constructor(private readonly responseToolkit: HapiResponseToolkit) {}

  public toBadRequest(message: string) {
    const error = Boom.badRequest();
    error.output.payload.message = message;
    return error;
  }

  public toInternalError() {
    const error = new Boom.Boom('', {
      statusCode: 500,
    });

    error.output.payload.message =
      'An internal server error occurred. Check Kibana server logs for details.';

    return error;
  }

  public handle(kibanaResponse: KibanaResponse) {
    if (!(kibanaResponse instanceof KibanaResponse)) {
      throw new Error(
        `Unexpected result from Route Handler. Expected KibanaResponse, but given: ${typeDetect(
          kibanaResponse
        )}.`
      );
    }

    return this.toHapiResponse(kibanaResponse);
  }

  private toHapiResponse(kibanaResponse: KibanaResponse) {
    if (kibanaResponse.options.bypassErrorFormat) {
      return this.toSuccess(kibanaResponse);
    }
    if (statusHelpers.isError(kibanaResponse.status)) {
      return this.toError(kibanaResponse);
    }
    if (statusHelpers.isSuccess(kibanaResponse.status)) {
      return this.toSuccess(kibanaResponse);
    }
    if (statusHelpers.isRedirect(kibanaResponse.status)) {
      return this.toRedirect(kibanaResponse);
    }
    if (kibanaResponse instanceof KibanaFileResponse) {
      return this.toFile(kibanaResponse);
    }
    throw new Error(
      `Unexpected Http status code. Expected from 100 to 599, but given: ${kibanaResponse.status}.`
    );
  }

  private toSuccess(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    const response = this.responseToolkit
      .response(kibanaResponse.payload)
      .code(kibanaResponse.status);
    setHeaders(response, kibanaResponse.options.headers);
    return response;
  }

  private toFile(kibanaResponse: KibanaFileResponse) {
    const response = this.responseToolkit.file(kibanaResponse.path, {
      etagMethod: kibanaResponse.options.etagMethod ?? 'hash',
      mode: kibanaResponse.options.download ? 'attachment' : false,
      filename: kibanaResponse.options.download
        ? kibanaResponse.options.download.filename
        : undefined,
      confine: REPO_ROOT,
      lookupMap: FILE_COMPRESSION_LOOKUP_MAP,
    });

    setHeaders(response, kibanaResponse.options.headers);

    if (kibanaResponse.options.immutable) {
      response.header('cache-control', `max-age=${365 * DAY}, immutable, stale-if-error`);
    } else if (!response.headers['cache-control']) {
      response.header('cache-control', 'must-revalidate');
    }

    return response;
  }

  private toRedirect(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    const { headers } = kibanaResponse.options;
    if (!headers || typeof headers.location !== 'string') {
      throw new Error("expected 'location' header to be set");
    }

    const response = this.responseToolkit
      .response(kibanaResponse.payload)
      .redirect(headers.location)
      .code(kibanaResponse.status)
      .takeover();

    setHeaders(response, kibanaResponse.options.headers);
    return response;
  }

  private toError(kibanaResponse: KibanaResponse<ResponseError | Buffer | stream.Readable>) {
    const { payload } = kibanaResponse;

    // Special case for when we are proxying requests and want to enable streaming back error responses opaquely.
    if (Buffer.isBuffer(payload) || payload instanceof stream.Readable) {
      const response = this.responseToolkit
        .response(kibanaResponse.payload)
        .code(kibanaResponse.status);
      setHeaders(response, kibanaResponse.options.headers);

      return response;
    }

    // we use for BWC with Boom payload for error responses - {error: string, message: string, statusCode: string}
    const error = new Boom.Boom('', {
      statusCode: kibanaResponse.status,
    });

    error.output.payload.message = getErrorMessage(payload);

    const attributes = getErrorAttributes(payload);
    if (attributes) {
      error.output.payload.attributes = attributes;
    }

    const headers = kibanaResponse.options.headers;
    if (headers) {
      error.output.headers = headers;
    }

    return error;
  }
}

function getErrorMessage(payload?: ResponseError): string {
  if (!payload) {
    throw new Error('expected error message to be provided');
  }
  if (typeof payload === 'string') return payload;
  // for ES response errors include nested error reason message. it doesn't contain sensitive data.
  if (isElasticsearchResponseError(payload)) {
    return `[${payload.message}]: ${
      (payload.meta.body as ElasticsearchErrorDetails)?.error?.reason
    }`;
  }

  return getErrorMessage(payload.message);
}

function getErrorAttributes(payload?: ResponseError): ResponseErrorAttributes | undefined {
  return typeof payload === 'object' && 'attributes' in payload ? payload.attributes : undefined;
}
