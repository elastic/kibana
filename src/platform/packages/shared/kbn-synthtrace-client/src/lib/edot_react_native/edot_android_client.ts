/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelScope } from '../otel_logs';
import { EVENT_APP_CRASH } from '../edot_shared/constants';
import type { EdotLog } from '../edot_shared/edot_log';
import { ERROR_KIND_ANR } from '../edot_shared/proposed_signals';
import {
  EdotReactNativeClientBase,
  type CrashOptions,
  type FreezeOptions,
  type HttpExceptionEventOptions,
  type HttpRequestOptions,
} from './edot_react_native_client';
import { MOBILE_PLATFORM } from './device_profiles';
import {
  MOBILE_SPAN_KIND,
  MOBILE_SPAN_STATUS,
  type EdotReactNativeSpan,
} from './edot_react_native_span';

// The OkHttp instrumentation version EDOT Android 1.10.0 ships with
const HTTP_SCOPE: OtelScope = { name: 'io.opentelemetry.okhttp-3.0', version: '2.31.1-alpha' };
const CRASH_SCOPE: OtelScope = { name: 'co.elastic.otel.android.instrumentation.crash' };
const ANR_SCOPE: OtelScope = { name: 'co.elastic.otel.android.instrumentation.anr' };

// `URL` drops the port when it is the default one of these schemes
const DEFAULT_PORTS: Readonly<Record<string, number>> = {
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
};

const REDACTED = 'REDACTED';
// The query parameters whose values the instrumentation redacts, matched by their exact name
const SENSITIVE_QUERY_PARAMETERS: ReadonlySet<string> = new Set([
  'AWSAccessKeyId',
  'Signature',
  'X-Amz-Signature',
  'X-Amz-Credential',
  'X-Amz-Security-Token',
  'sig',
  'X-Goog-Signature',
]);
// How EDOT Android's HttpSpanNameInterceptor finds the host in `url.full`, `https?://([^/]+).*`.
// The trailing `.*` doesn't change the capture and would backtrack polynomially on long hosts.
const HTTP_SPAN_NAME_PATTERN = /^https?:\/\/([^/]+)/;

const redactQuery = (url: string): string => {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  const fragmentStart = url.indexOf('#', queryStart);
  const queryEnd = fragmentStart === -1 ? url.length : fragmentStart;
  const query = url
    .slice(queryStart + 1, queryEnd)
    .split('&')
    .map((parameter) => {
      const nameEnd = parameter.indexOf('=');
      return nameEnd !== -1 && SENSITIVE_QUERY_PARAMETERS.has(parameter.slice(0, nameEnd))
        ? `${parameter.slice(0, nameEnd)}=${REDACTED}`
        : parameter;
    })
    .join('&');
  return `${url.slice(0, queryStart + 1)}${query}${url.slice(queryEnd)}`;
};

/**
 * `url.full` as the OkHttp instrumentation sanitizes it: any user info becomes
 * `REDACTED:REDACTED`, and the values of sensitive query parameters `REDACTED`.
 */
const sanitizeUrl = (url: URL): string => {
  const withoutUserInfo =
    url.username || url.password
      ? `${url.protocol}//${REDACTED}:${REDACTED}@${url.host}${url.pathname}${url.search}${url.hash}`
      : url.href;
  return redactQuery(withoutUserInfo);
};

/** A stable address from the documentation range for each host. */
const peerAddressOf = (hostname: string): string => {
  const hash = Array.from(hostname).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 254, 7);
  return `203.0.113.${hash + 1}`;
};

/** One installation of an EDOT React Native app on an Android device, recorded by EDOT Android. */
export class EdotAndroidClient extends EdotReactNativeClientBase {
  public readonly platform = MOBILE_PLATFORM.ANDROID;
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
    const urlFull = sanitizeUrl(parsedUrl);
    // EDOT Android renames the span at export after what precedes the path in the sanitized URL:
    // the host, the port when it isn't the default one, and the redacted user info
    const [, authority] = HTTP_SPAN_NAME_PATTERN.exec(urlFull) ?? [];
    const serverPort: number | undefined =
      Number(parsedUrl.port) || DEFAULT_PORTS[parsedUrl.protocol];
    const isError = errorType !== undefined || (statusCode !== undefined && statusCode >= 400);
    const resolvedErrorType =
      errorType ?? (statusCode !== undefined && statusCode >= 400 ? String(statusCode) : undefined);
    return this.span({
      traceId,
      spanId,
      parentSpanId,
      name: authority ? `${method} ${authority}` : method,
      kind: MOBILE_SPAN_KIND.CLIENT,
      scope: HTTP_SCOPE,
      status: isError ? MOBILE_SPAN_STATUS.ERROR : MOBILE_SPAN_STATUS.UNSET,
      attributes: {
        'http.request.method': method,
        'url.full': urlFull,
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
        'otel.event.name': EVENT_APP_CRASH,
        'exception.type': type,
        'exception.message': message,
        'exception.stacktrace': stacktrace,
        ...this.logAttributes,
      },
      { eventName: EVENT_APP_CRASH }
    );
  }

  /** An ANR: the main thread didn't answer within the system's timeout. */
  freeze({ durationMs }: FreezeOptions): EdotLog {
    const message = `Application did not respond for ${Math.round(durationMs)}ms`;
    return this.freezeLog(ANR_SCOPE, ERROR_KIND_ANR, {
      type: 'ApplicationNotResponding',
      message,
      stacktrace: [
        'ApplicationNotResponding: ' + message,
        '\tat android.os.MessageQueue.nativePollOnce(Native Method)',
        '\tat android.os.MessageQueue.next(MessageQueue.java:335)',
        '\tat android.os.Looper.loopOnce(Looper.java:186)',
        '\tat android.os.Looper.loop(Looper.java:313)',
        '\tat android.app.ActivityThread.main(ActivityThread.java:8663)',
      ].join('\n'),
    });
  }
}
