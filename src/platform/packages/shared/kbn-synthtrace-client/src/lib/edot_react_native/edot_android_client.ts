/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelScope } from '../otel_logs';
import type { EdotLog } from '../edot_shared/edot_log';
import {
  EdotReactNativeClientBase,
  type CrashOptions,
  type HttpExceptionEventOptions,
  type HttpRequestOptions,
} from './edot_react_native_client';
import type { EdotReactNativeSpan } from './edot_react_native_span';

// The OkHttp instrumentation version EDOT Android 1.10.0 ships with
const HTTP_SCOPE: OtelScope = { name: 'io.opentelemetry.okhttp-3.0', version: '2.31.1-alpha' };
const CRASH_SCOPE: OtelScope = { name: 'co.elastic.otel.android.instrumentation.crash' };

// `URL` drops the port when it is the default one of these schemes
const DEFAULT_PORTS: Readonly<Record<string, number>> = {
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
};

/** A sanitized `url.full`, as the OkHttp instrumentation redacts credentials in URLs. */
const redactUserInfo = (url: URL): string => {
  if (!url.username && !url.password) {
    return url.href;
  }
  const redacted = new URL(url.href);
  redacted.username = 'REDACTED';
  redacted.password = url.password ? 'REDACTED' : '';
  return redacted.href;
};

/** A stable address from the documentation range for each host. */
const peerAddressOf = (hostname: string): string => {
  const hash = Array.from(hostname).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 254, 7);
  return `203.0.113.${hash + 1}`;
};

/** One installation of an EDOT React Native app on an Android device, recorded by EDOT Android. */
export class EdotAndroidClient extends EdotReactNativeClientBase {
  public readonly platform = 'android' as const;
  protected readonly cellularOnAllSpans = true;

  protected formatUuid(uuid: string): string {
    return uuid.toLowerCase();
  }

  protected get logAttributes(): Record<string, string> {
    const { subtype } = this.network;
    return {
      ...super.logAttributes,
      ...(subtype ? { 'network.connection.subtype': subtype } : {}),
    };
  }

  httpRequest({
    method,
    url,
    statusCode,
    errorType,
    traceId,
    spanId,
    parentSpanId,
  }: HttpRequestOptions): EdotReactNativeSpan {
    const parsedUrl = new URL(url);
    const serverPort: number | undefined =
      Number(parsedUrl.port) || DEFAULT_PORTS[parsedUrl.protocol];
    const isError = errorType !== undefined || (statusCode !== undefined && statusCode >= 400);
    const resolvedErrorType =
      errorType ?? (statusCode !== undefined && statusCode >= 400 ? String(statusCode) : undefined);
    return this.span({
      traceId,
      spanId,
      parentSpanId,
      // Renamed at export by EDOT Android; `host` only has the port when it isn't the default
      name: `${method} ${parsedUrl.host}`,
      kind: 'Client',
      scope: HTTP_SCOPE,
      status: isError ? 'Error' : 'Unset',
      attributes: {
        'http.request.method': method,
        'url.full': redactUserInfo(parsedUrl),
        'server.address': parsedUrl.hostname,
        ...(serverPort !== undefined ? { 'server.port': serverPort } : {}),
        ...(statusCode !== undefined
          ? {
              'http.response.status_code': statusCode,
              'network.protocol.version': parsedUrl.protocol === 'https:' ? '2' : '1.1',
              'network.peer.address': peerAddressOf(parsedUrl.hostname),
              ...(serverPort !== undefined ? { 'network.peer.port': serverPort } : {}),
            }
          : {}),
        ...(resolvedErrorType !== undefined ? { 'error.type': resolvedErrorType } : {}),
        ...this.httpSpanAttributes(),
      },
    });
  }

  /**
   * The `exception` span event of a failed HTTP request, which the OkHttp instrumentation adds
   * only for transport errors.
   */
  httpExceptionEvent({
    traceId,
    spanId,
    errorType,
    errorMessage = '',
  }: HttpExceptionEventOptions): EdotLog | undefined {
    if (errorType === undefined) {
      return undefined;
    }
    return this.exceptionEvent(
      HTTP_SCOPE,
      {
        'exception.type': errorType,
        'exception.message': errorMessage,
        'exception.stacktrace': `${errorType}: ${errorMessage}\n\tat okhttp3.internal.connection.RealCall.execute(RealCall.kt:154)`,
      },
      { traceId, spanId }
    );
  }

  crash({ type, message, stacktrace }: CrashOptions): EdotLog {
    return this.log(
      CRASH_SCOPE,
      {
        'otel.event.name': 'app.crash',
        'exception.type': type,
        'exception.message': message,
        'exception.stacktrace': stacktrace,
        ...this.logAttributes,
      },
      { eventName: 'app.crash' }
    );
  }
}
