/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelScope } from '../otel_logs';
import { EVENT_APP_CRASH, SEVERITY_FATAL } from '../edot_shared/constants';
import { ERROR_KIND_HANG } from '../edot_shared/proposed_signals';
import type { EdotLog } from '../edot_shared/edot_log';
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
import { iosCrashReport, type IosCrashReport } from './ios_crash_report';

const HTTP_SCOPE: OtelScope = { name: 'NSURLSession', version: '1.0.0' };
const CRASH_SCOPE: OtelScope = { name: 'PLCrashReporter', version: '0.0.3' };
const VIEW_CONTROLLER_SCOPE: OtelScope = { name: 'UIViewController', version: '0.0.3' };
const LIFECYCLE_SCOPE: OtelScope = { name: 'ApplicationLifecycle' };
const HANG_SCOPE: OtelScope = { name: 'AppHangs', version: '0.0.3' };

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
  public readonly platform = MOBILE_PLATFORM.IOS;
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
      kind: MOBILE_SPAN_KIND.CLIENT,
      scope: HTTP_SCOPE,
      status: isError ? MOBILE_SPAN_STATUS.ERROR : MOBILE_SPAN_STATUS.UNSET,
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
      { eventName: EVENT_APP_CRASH, severityNumber: SEVERITY_FATAL }
    );
  }

  /** A hang: the main thread was blocked for longer than the hang threshold. */
  freeze({ durationMs }: FreezeOptions): EdotLog {
    const message = `Main thread blocked for ${(durationMs / 1_000).toFixed(1)} seconds`;
    return this.freezeLog(HANG_SCOPE, ERROR_KIND_HANG, {
      type: 'AppHang',
      message,
      stacktrace: [
        'Thread 0 (main thread):',
        '0   libsystem_kernel.dylib      0x00000001f2a3c8b4 mach_msg2_trap + 8',
        '1   libsystem_kernel.dylib      0x00000001f2a4f0d0 mach_msg2_internal + 76',
        '2   CoreFoundation              0x00000001a1b6a5b0 __CFRunLoopServiceMachPort + 160',
        '3   CoreFoundation              0x00000001a1b68e2c __CFRunLoopRun + 1208',
        '4   UIKitCore                   0x00000001a4c8b2a4 UIApplicationMain + 340',
      ].join('\n'),
    });
  }

  /**
   * The PLCrashReporter report of a crash of this installation, as EDOT iOS cuts it down for
   * `exception.stacktrace`, and the signal's address for `exception.message`.
   */
  crashReport({
    signal,
    code,
    crashedAt,
    random,
  }: {
    signal: string;
    code: string;
    crashedAt: number;
    random: () => number;
  }): IosCrashReport {
    const {
      'service.name': serviceName,
      'service.version': serviceVersion,
      'app.build_id': buildNumber,
      'device.model.identifier': hardwareModel,
      'os.version': fullOsVersion,
      'os.description': osDescription,
    } = this.resourceAttributes;
    // `os.description` keeps the version as the OS reports it, e.g. `18.1` rather than `18.1.0`
    const [, osVersion = String(fullOsVersion), osBuild = ''] =
      /Version (\S+) \(Build (\S+)\)/.exec(String(osDescription)) ?? [];
    return iosCrashReport({
      signal,
      code,
      crashedAt,
      // The bundle's executable, named after the app like Xcode's default product name
      executable: String(serviceName)
        .split(/[^a-z0-9]+/i)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(''),
      appId: this.appId,
      serviceVersion: String(serviceVersion),
      buildNumber: String(buildNumber),
      hardwareModel: String(hardwareModel),
      osVersion,
      osBuild,
      installationId: this.formatUuid(this.options.installationId),
      native: this.native,
      random,
    });
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
      kind: MOBILE_SPAN_KIND.CLIENT,
      scope: VIEW_CONTROLLER_SCOPE,
      status: MOBILE_SPAN_STATUS.OK,
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
