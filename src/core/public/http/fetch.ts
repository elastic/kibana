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

import { merge } from 'lodash';
import { format } from 'url';

import { IBasePath, HttpInterceptor, HttpHandler, HttpFetchOptions, IHttpResponse } from './types';
import { HttpFetchError } from './http_fetch_error';
import { HttpInterceptController } from './http_intercept_controller';
import { HttpResponse } from './response';
import { interceptRequest, interceptResponse } from './intercept';
import { HttpInterceptHaltError } from './http_intercept_halt_error';

interface Params {
  basePath: IBasePath;
  kibanaVersion: string;
}

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;

export class FetchService {
  private readonly interceptors = new Set<HttpInterceptor>();

  constructor(private readonly params: Params) {}

  public intercept(interceptor: HttpInterceptor) {
    this.interceptors.add(interceptor);
    return () => this.interceptors.delete(interceptor);
  }

  public removeAllInterceptors() {
    this.interceptors.clear();
  }

  public fetch: HttpHandler = async <TResponseBody>(
    path: string,
    options: HttpFetchOptions = {}
  ) => {
    const initialRequest = this.createRequest(path, options);
    const controller = new HttpInterceptController();

    // We wrap the interception in a separate promise to ensure that when
    // a halt is called we do not resolve or reject, halting handling of the promise.
    return new Promise<TResponseBody | IHttpResponse<TResponseBody>>(async (resolve, reject) => {
      try {
        const interceptedRequest = await interceptRequest(
          initialRequest,
          this.interceptors,
          controller
        );
        const initialResponse = this.fetchResponse(interceptedRequest);
        const interceptedResponse = await interceptResponse(
          initialResponse,
          this.interceptors,
          controller
        );

        if (options.asResponse) {
          resolve(interceptedResponse);
        } else {
          resolve(interceptedResponse.body);
        }
      } catch (error) {
        if (!(error instanceof HttpInterceptHaltError)) {
          reject(error);
        }
      }
    });
  };

  private createRequest(path: string, options?: HttpFetchOptions): Request {
    // Merge and destructure options out that are not applicable to the Fetch API.
    const { query, prependBasePath: shouldPrependBasePath, asResponse, ...fetchOptions } = merge(
      {
        method: 'GET',
        credentials: 'same-origin',
        prependBasePath: true,
        headers: {
          'kbn-version': this.params.kibanaVersion,
          'Content-Type': 'application/json',
        },
      },
      options || {}
    );
    const url = format({
      pathname: shouldPrependBasePath ? this.params.basePath.prepend(path) : path,
      query,
    });

    if (
      options &&
      options.headers &&
      'Content-Type' in options.headers &&
      options.headers['Content-Type'] === undefined
    ) {
      delete fetchOptions.headers['Content-Type'];
    }

    return new Request(url, fetchOptions);
  }

  private async fetchResponse(request: Request) {
    let response: Response;
    let body = null;

    try {
      response = await window.fetch(request);
    } catch (err) {
      throw new HttpFetchError(err.message, request);
    }

    const contentType = response.headers.get('Content-Type') || '';

    try {
      if (NDJSON_CONTENT.test(contentType)) {
        body = await response.blob();
      } else if (JSON_CONTENT.test(contentType)) {
        body = await response.json();
      } else {
        const text = await response.text();

        try {
          body = JSON.parse(text);
        } catch (err) {
          body = text;
        }
      }
    } catch (err) {
      throw new HttpFetchError(err.message, request, response, body);
    }

    if (!response.ok) {
      throw new HttpFetchError(response.statusText, request, response, body);
    }

    return new HttpResponse({ request, response, body });
  }
}
