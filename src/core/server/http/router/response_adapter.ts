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

import { HttpResponsePayload, KibanaResponse } from './response';
import { ResponseError } from './response_error';

function setHeaders(response: HapiResponseObject, headers: Record<string, string | string[]> = {}) {
  Object.entries(headers).forEach(([header, value]) => {
    if (value !== undefined) {
      // Hapi typings for header accept only string, although string[] is a valid value
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
    return this.responseToolkit.response({ error: message }).code(400);
  }

  public toInternalError() {
    return this.responseToolkit.response({ error: 'An internal server error occurred.' }).code(500);
  }

  public handle(kibanaResponse: KibanaResponse<any>) {
    if (!(kibanaResponse instanceof KibanaResponse)) {
      throw new Error(
        `Unexpected result from Route Handler. Expected KibanaResponse, but given: ${typeDetect(
          kibanaResponse
        )}.`
      );
    }

    const response = this.toHapiResponse(kibanaResponse);
    setHeaders(response, kibanaResponse.options.headers);
    return response;
  }

  private toHapiResponse(kibanaResponse: KibanaResponse<any>) {
    if (statusHelpers.isSuccess(kibanaResponse.status)) {
      return this.toSuccess(kibanaResponse);
    }
    if (statusHelpers.isRedirect(kibanaResponse.status)) {
      return this.toRedirect(kibanaResponse);
    }
    if (statusHelpers.isError(kibanaResponse.status)) {
      return this.toError(kibanaResponse);
    }
    throw new Error(
      `Unexpected Http status code. Expected from 100 to 599, but given: ${kibanaResponse.status}.`
    );
  }

  private toSuccess(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    return this.responseToolkit.response(kibanaResponse.payload).code(kibanaResponse.status);
  }

  private toRedirect(kibanaResponse: KibanaResponse<HttpResponsePayload>) {
    const { headers } = kibanaResponse.options;
    if (!headers || typeof headers.location !== 'string') {
      throw new Error("expected 'location' header to be set");
    }

    return this.responseToolkit
      .response(kibanaResponse.payload)
      .redirect(headers.location)
      .code(kibanaResponse.status);
  }

  private toError(kibanaResponse: KibanaResponse<ResponseError>) {
    if (!(kibanaResponse.payload instanceof Error)) {
      throw new Error(`expected Error object, but given ${typeDetect(kibanaResponse.payload)}`);
    }
    const payload = {
      error: kibanaResponse.payload.message,
      meta: kibanaResponse.payload.meta,
    };
    return this.responseToolkit.response(payload).code(kibanaResponse.status);
  }
}
