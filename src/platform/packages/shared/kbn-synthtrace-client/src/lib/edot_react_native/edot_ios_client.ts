/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelScope } from '../otel_logs';
import { SEVERITY_FATAL } from '../edot_shared/constants';
import type { EdotLog } from '../edot_shared/edot_log';
import {
  EdotReactNativeClientBase,
  type CrashOptions,
  type HttpExceptionEventOptions,
  type HttpRequestOptions,
} from './edot_react_native_client';
import type { EdotReactNativeSpan } from './edot_react_native_span';

const HTTP_SCOPE: OtelScope = { name: 'NSURLSession', version: '1.0.0' };
const CRASH_SCOPE: OtelScope = { name: 'PLCrashReporter', version: '0.0.3' };
const VIEW_CONTROLLER_SCOPE: OtelScope = { name: 'UIViewController', version: '0.0.3' };
const LIFECYCLE_SCOPE: OtelScope = { name: 'ApplicationLifecycle' };

// `HTTPURLResponse.localizedString(forStatusCode:)`, which EDOT iOS writes on HTTP errors
const STATUS_TEXT: Readonly<Record<number, string>> = {
  400: 'bad request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not found',
  408: 'request timed out',
  429: 'too many requests',
  500: 'internal server error',
  502: 'bad gateway',
  503: 'service unavailable',
  504: 'gateway timed out',
};

/** Like `HTTPURLResponse.localizedString(forStatusCode:)`, with its fallback per status class. */
const statusText = (statusCode: number): string =>
  STATUS_TEXT[statusCode] ?? (statusCode < 500 ? 'client error' : 'server error');

export type IosAppState = 'active' | 'inactive' | 'background' | 'foreground' | 'terminate';

/** One installation of an EDOT React Native app on an iOS device, recorded by EDOT iOS. */
export class EdotIosClient extends EdotReactNativeClientBase {
  public readonly platform = 'ios' as const;
  // EDOT iOS only adds the cellular details to HTTP spans, and never to logs
  protected readonly cellularOnAllSpans = false;

  protected formatUuid(uuid: string): string {
    return uuid.toUpperCase();
  }

  protected deviceAttributes(): Record<string, string> {
    const { deviceId } = this.options;
    return deviceId ? { 'device.id': deviceId.toUpperCase() } : {};
  }

  httpRequest({
    method,
    url,
    statusCode,
    errorType,
    requestBodySize,
    responseBodySize,
    traceId,
    spanId,
    parentSpanId,
  }: HttpRequestOptions): EdotReactNativeSpan {
    const parsedUrl = new URL(url);
    const isError =
      errorType !== undefined || statusCode === undefined || statusCode < 100 || statusCode >= 400;
    return this.span({
      traceId,
      spanId,
      parentSpanId,
      // EDOT iOS names HTTP spans after the host, without the port
      name: `${method} ${parsedUrl.hostname}`,
      kind: 'Client',
      scope: HTTP_SCOPE,
      status: isError ? 'Error' : 'Unset',
      attributes: {
        'http.request.method': method,
        'url.full': parsedUrl.href,
        'url.path': parsedUrl.pathname,
        'url.scheme': parsedUrl.protocol.replace(':', ''),
        'server.address': parsedUrl.hostname,
        ...(parsedUrl.port ? { 'server.port': Number(parsedUrl.port) } : {}),
        ...(requestBodySize !== undefined ? { 'http.request.body.size': requestBodySize } : {}),
        ...(statusCode !== undefined ? { 'http.response.status_code': statusCode } : {}),
        ...(statusCode !== undefined && responseBodySize !== undefined
          ? { 'http.response.body.size': responseBodySize }
          : {}),
        // Only transport errors get an error type, 4xx/5xx get an `exception` span event
        ...(errorType !== undefined ? { 'error.type': errorType } : {}),
        ...this.httpSpanAttributes(),
      },
    });
  }

  /**
   * The `exception` span event of a failed HTTP request, which EDOT iOS adds for transport errors
   * and 4xx/5xx responses.
   */
  httpExceptionEvent({
    traceId,
    spanId,
    statusCode,
    errorType,
    errorMessage = '',
  }: HttpExceptionEventOptions): EdotLog | undefined {
    const ids = { traceId, spanId };
    if (errorType !== undefined) {
      return this.exceptionEvent(
        HTTP_SCOPE,
        { 'exception.type': errorType, 'exception.message': errorMessage },
        ids
      );
    }
    if (statusCode !== undefined && statusCode >= 400) {
      return this.exceptionEvent(
        HTTP_SCOPE,
        { 'exception.type': String(statusCode), 'exception.message': statusText(statusCode) },
        ids
      );
    }
    return undefined;
  }

  /**
   * A crash as PLCrashReporter records it, which EDOT iOS reports on the next launch, so set
   * `observedAt` to the crash time.
   */
  crash({ type, message, stacktrace }: CrashOptions): EdotLog {
    // The crash reporter skips the log processors, so only the session and connection are set
    return this.log(
      CRASH_SCOPE,
      {
        'exception.type': type,
        'exception.message': message,
        'exception.stacktrace': stacktrace,
        ...this.logAttributes,
      },
      { eventName: 'app.crash', severityNumber: SEVERITY_FATAL }
    );
  }

  /** A screen appearing, from `viewWillAppear` to `viewDidAppear`, titled like its view controller. */
  viewAppearing({
    title,
    traceId,
    spanId,
  }: {
    title: string;
    traceId?: string;
    spanId?: string;
  }): EdotReactNativeSpan {
    return this.span({
      name: `${title} - view appearing`,
      kind: 'Client',
      scope: VIEW_CONTROLLER_SCOPE,
      status: 'Ok',
      attributes: this.spanAttributes(),
      traceId,
      spanId,
    });
  }

  /** A UIApplication lifecycle notification. */
  lifecycle(state: IosAppState): EdotLog {
    return this.log(
      LIFECYCLE_SCOPE,
      { 'ios.app.state': state, ...this.logAttributes },
      { eventName: 'device.app.lifecycle' }
    );
  }
}
