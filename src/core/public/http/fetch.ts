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

import {
  IBasePath,
  HttpInterceptor,
  HttpHandler,
  HttpFetchOptions,
  HttpResponse,
  HttpFetchOptionsWithPath,
} from './types';
import { HttpFetchError } from './http_fetch_error';
import { HttpInterceptController } from './http_intercept_controller';
import { interceptRequest, interceptResponse } from './intercept';
import { HttpInterceptHaltError } from './http_intercept_halt_error';

interface Params {
  basePath: IBasePath;
  kibanaVersion: string;
}

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;

export class Fetch {
  private readonly interceptors = new Set<HttpInterceptor>();

  constructor(private readonly params: Params) {}

  public intercept(interceptor: HttpInterceptor) {
    this.interceptors.add(interceptor);
    return () => {
      this.interceptors.delete(interceptor);
    };
  }

  public removeAllInterceptors() {
    this.interceptors.clear();
  }

  public readonly delete = this.shorthand('DELETE');
  public readonly get = this.shorthand('GET');
  public readonly head = this.shorthand('HEAD');
  public readonly options = this.shorthand('options');
  public readonly patch = this.shorthand('PATCH');
  public readonly post = this.shorthand('POST');
  public readonly put = this.shorthand('PUT');

  public fetch: HttpHandler = async <TResponseBody>(
    pathOrOptions: string | HttpFetchOptionsWithPath,
    options?: HttpFetchOptions
  ) => {
    const optionsWithPath = validateFetchArguments(pathOrOptions, options);
    const controller = new HttpInterceptController();

    // We wrap the interception in a separate promise to ensure that when
    // a halt is called we do not resolve or reject, halting handling of the promise.
    return new Promise<TResponseBody | HttpResponse<TResponseBody>>(async (resolve, reject) => {
      try {
        const interceptedOptions = await interceptRequest(
          optionsWithPath,
          this.interceptors,
          controller
        );
        const initialResponse = this.fetchResponse(interceptedOptions);
        const interceptedResponse = await interceptResponse(
          interceptedOptions,
          initialResponse,
          this.interceptors,
          controller
        );

        if (optionsWithPath.asResponse) {
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

  private createRequest(options: HttpFetchOptionsWithPath): Request {
    // Merge and destructure options out that are not applicable to the Fetch API.
    const {
      query,
      prependBasePath: shouldPrependBasePath,
      asResponse,
      asSystemRequest,
      ...fetchOptions
    } = merge(
      {
        method: 'GET',
        credentials: 'same-origin',
        prependBasePath: true,
      },
      options,
      {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          'kbn-version': this.params.kibanaVersion,
        },
      }
    );
    const url = format({
      pathname: shouldPrependBasePath ? this.params.basePath.prepend(options.path) : options.path,
      query,
    });

    // Make sure the system request header is only present if `asSystemRequest` is true.
    if (asSystemRequest) {
      fetchOptions.headers['kbn-system-request'] = 'true';
    }

    return new Request(url, fetchOptions);
  }

  private async fetchResponse(fetchOptions: HttpFetchOptionsWithPath): Promise<HttpResponse<any>> {
    const request = this.createRequest(fetchOptions);
    let response: Response;
    let body = null;

    try {
      response = await window.fetch(request);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err;
      } else {
        throw new HttpFetchError(err.message, request);
      }
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

    return { fetchOptions, request, response, body };
  }

  private shorthand(method: string): HttpHandler {
    return (pathOrOptions: string | HttpFetchOptionsWithPath, options?: HttpFetchOptions) => {
      const optionsWithPath = validateFetchArguments(pathOrOptions, options);
      return this.fetch({ ...optionsWithPath, method });
    };
  }
}

/**
 * Ensure that the overloaded arguments to `HttpHandler` are valid.
 */
const validateFetchArguments = (
  pathOrOptions: string | HttpFetchOptionsWithPath,
  options?: HttpFetchOptions
): HttpFetchOptionsWithPath => {
  let fullOptions: HttpFetchOptionsWithPath;

  if (typeof pathOrOptions === 'string' && (typeof options === 'object' || options === undefined)) {
    fullOptions = { ...options, path: pathOrOptions };
  } else if (typeof pathOrOptions === 'object' && options === undefined) {
    fullOptions = pathOrOptions;
  } else {
    throw new Error(
      `Invalid fetch arguments, must either be (string, object) or (object, undefined), received (${typeof pathOrOptions}, ${typeof options})`
    );
  }

  const invalidHeaders = Object.keys(fullOptions.headers ?? {}).filter(headerName =>
    headerName.startsWith('kbn-')
  );
  if (invalidHeaders.length) {
    throw new Error(
      `Invalid fetch headers, headers beginning with "kbn-" are not allowed: [${invalidHeaders.join(
        ','
      )}]`
    );
  }

  return fullOptions;
};
