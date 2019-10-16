/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ResponseObject as HapiResponseObject, ResponseToolkit as HapiResponseToolkit } from 'hapi';
import typeDetect from 'type-detect';
import Boom from 'boom';

import {
  HttpResponsePayload,
  KibanaResponse,
  ResponseError,
  ResponseErrorAttributes,
} from './response';

function setHeaders(response: HapiResponseObject, headers: Record<string, string | string[]> = {}) {
  Object.entries(headers).forEach(([header, value]) => {
    if (value !== undefined) {
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
    const error = new Boom('', {
      statusCode: 500,
    });

    error.output.payload.message = 'An internal server error occurred.';

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
    const response = this.responseToolkit
      .response(kibanaResponse.payload)
      .code(kibanaResponse.status);
    setHeaders(response, kibanaResponse.options.headers);
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

  private toError(kibanaResponse: KibanaResponse<ResponseError>) {
    const { payload } = kibanaResponse;
    // we use for BWC with Boom payload for error responses - {error: string, message: string, statusCode: string}
    const error = new Boom('', {
      statusCode: kibanaResponse.status,
    });

    error.output.payload.message = getErrorMessage(payload);

    const attributes = getErrorAttributes(payload);
    if (attributes) {
      error.output.payload.attributes = attributes;
    }

    const headers = kibanaResponse.options.headers;
    if (headers) {
      // Hapi typings for header accept only strings, although string[] is a valid value
      error.output.headers = headers as any;
    }

    return error;
  }
}

function getErrorMessage(payload?: ResponseError): string {
  if (!payload) {
    throw new Error('expected error message to be provided');
  }
  if (typeof payload === 'string') return payload;
  return getErrorMessage(payload.message);
}

function getErrorAttributes(payload?: ResponseError): ResponseErrorAttributes | undefined {
  return typeof payload === 'object' && 'attributes' in payload ? payload.attributes : undefined;
}
