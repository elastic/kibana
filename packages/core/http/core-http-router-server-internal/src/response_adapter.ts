/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyReply } from 'fastify';
import typeDetect from 'type-detect';
import Boom from '@hapi/boom';
import * as stream from 'stream';
import {
  ElasticsearchErrorDetails,
  isResponseError as isElasticsearchResponseError,
} from '@kbn/es-errors';
import { HttpResponsePayload, ResponseError, ResponseErrorAttributes } from '@kbn/core-http-server';
import { KibanaResponse } from './response';

const statusHelpers = {
  isSuccess: (code: number) => code >= 100 && code < 300,
  isRedirect: (code: number) => code >= 300 && code < 400,
  isError: (code: number) => code >= 400 && code < 600,
};

export class FastifyResponseAdapter {
  constructor(private readonly reply: FastifyReply) {}

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

    return this.toFastifyResponse(kibanaResponse);
  }

  private toFastifyResponse(kibanaResponse: KibanaResponse) {
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
    throw new Error(
      `Unexpected Http status code. Expected from 100 to 599, but given: ${kibanaResponse.status}.`
    );
  }

  private toSuccess(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    return this.reply
      .send(kibanaResponse.payload)
      .code(kibanaResponse.status)
      .headers(kibanaResponse.options.headers ?? {});
  }

  private toRedirect(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    const { headers } = kibanaResponse.options;
    if (!headers || typeof headers.location !== 'string') {
      throw new Error("expected 'location' header to be set");
    }

    return this.reply
      .send(kibanaResponse.payload)
      .redirect(headers.location)
      .code(kibanaResponse.status)
      .headers(kibanaResponse.options.headers ?? {})
      .hijack();
  }

  private toError(kibanaResponse: KibanaResponse<ResponseError | Buffer | stream.Readable>) {
    const { payload } = kibanaResponse;

    // Special case for when we are proxying requests and want to enable streaming back error responses opaquely.
    if (Buffer.isBuffer(payload) || payload instanceof stream.Readable) {
      return this.reply
        .send(kibanaResponse.payload)
        .code(kibanaResponse.status)
        .headers(kibanaResponse.options.headers ?? {});
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
