/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, omitBy } from 'lodash';
import { format } from 'url';
import { BehaviorSubject } from 'rxjs';

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
import { ExecutionContextContainer, ExecutionContextSetup } from '../execution_context';

interface Params {
  basePath: IBasePath;
  kibanaVersion: string;
  executionContext: ExecutionContextSetup;
}

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;
const ZIP_CONTENT = /^(application\/zip)(;.*)?$/;

const removedUndefined = (obj: Record<string, any> | undefined) => {
  return omitBy(obj, (v) => v === undefined);
};

export class Fetch {
  private readonly interceptors = new Set<HttpInterceptor>();
  private readonly requestCount$ = new BehaviorSubject(0);

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

  public getRequestCount$() {
    return this.requestCount$.asObservable();
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
        this.requestCount$.next(this.requestCount$.value + 1);
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
          resolve(interceptedResponse as HttpResponse<TResponseBody>);
        } else {
          resolve(interceptedResponse.body as TResponseBody);
        }
      } catch (error) {
        if (!(error instanceof HttpInterceptHaltError)) {
          reject(error);
        }
      } finally {
        this.requestCount$.next(this.requestCount$.value - 1);
      }
    });
  };

  private createRequest(options: HttpFetchOptionsWithPath): Request {
    const context = this.params.executionContext.withGlobalContext(options.context);
    // Merge and destructure options out that are not applicable to the Fetch API.
    const {
      query,
      prependBasePath: shouldPrependBasePath,
      asResponse,
      asSystemRequest,
      ...fetchOptions
    } = {
      method: 'GET',
      credentials: 'same-origin',
      prependBasePath: true,
      ...options,
      // options can pass an `undefined` Content-Type to erase the default value.
      // however we can't pass it to `fetch` as it will send an `Content-Type: Undefined` header
      headers: removedUndefined({
        'Content-Type': 'application/json',
        ...options.headers,
        'kbn-version': this.params.kibanaVersion,
        ...(!isEmpty(context) ? new ExecutionContextContainer(context).toHeader() : {}),
      }),
    };

    const url = format({
      pathname: shouldPrependBasePath ? this.params.basePath.prepend(options.path) : options.path,
      query: removedUndefined(query),
    });

    // Make sure the system request header is only present if `asSystemRequest` is true.
    if (asSystemRequest) {
      fetchOptions.headers['kbn-system-request'] = 'true';
    }

    return new Request(url, fetchOptions as RequestInit);
  }

  private async fetchResponse(
    fetchOptions: HttpFetchOptionsWithPath
  ): Promise<HttpResponse<unknown>> {
    const request = this.createRequest(fetchOptions);
    let response: Response;
    let body = null;

    try {
      response = await window.fetch(request);
    } catch (err) {
      throw new HttpFetchError(err.message, err.name ?? 'Error', request);
    }

    const contentType = response.headers.get('Content-Type') || '';

    try {
      if (NDJSON_CONTENT.test(contentType) || ZIP_CONTENT.test(contentType)) {
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
      throw new HttpFetchError(err.message, err.name ?? 'Error', request, response, body);
    }

    if (!response.ok) {
      throw new HttpFetchError(response.statusText, 'Error', request, response, body);
    }

    return { fetchOptions, request, response, body };
  }

  private shorthand(method: string): HttpHandler {
    return <T = unknown>(
      pathOrOptions: string | HttpFetchOptionsWithPath,
      options?: HttpFetchOptions
    ) => {
      const optionsWithPath: HttpFetchOptionsWithPath = validateFetchArguments(
        pathOrOptions,
        options
      );
      return this.fetch<HttpResponse<T>>({ ...optionsWithPath, method });
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

  const invalidHeaders = Object.keys(fullOptions.headers ?? {}).filter((headerName) =>
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
