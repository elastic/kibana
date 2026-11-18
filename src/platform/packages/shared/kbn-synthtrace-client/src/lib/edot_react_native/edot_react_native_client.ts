/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OtelScope } from '../otel_logs';
import { generateLongId, generateShortId } from '../utils/generate_id';
import {
  LOGS_INDEX,
  SEVERITY_ERROR,
  SEVERITY_FATAL,
  SEVERITY_WARN,
  TRACES_INDEX,
} from '../edot_shared/constants';
import { EdotLog } from '../edot_shared/edot_log';
import { EdotSpan } from '../edot_shared/edot_span';
import {
  ATTR_APP_START_DURATION,
  ATTR_ERROR_KIND,
  ATTR_SCREEN_NAME,
  ATTR_SESSION_PREVIOUS_ID,
  ATTR_START_TYPE,
  EVENT_APP_START,
  EVENT_EXCEPTION,
  EVENT_SCREEN_CLICK,
  EVENT_SESSION_END,
  EVENT_SESSION_START,
  EVENT_WIDGET_CLICK,
  SPAN_SCREEN_LOAD,
  type AppStartType,
  type FreezeKind,
} from '../edot_shared/proposed_signals';
import { asFloat } from '../edot_browser/as_float';
import type { MobilePlatform } from './device_profiles';
import type { EdotAndroidClient } from './edot_android_client';
import type { EdotIosClient } from './edot_ios_client';
import {
  MOBILE_SPAN_KIND,
  MOBILE_SPAN_STATUS,
  type EdotReactNativeSpan,
  type EdotReactNativeSpanDocument,
  type EdotReactNativeSpanKind,
  type EdotReactNativeSpanStatus,
} from './edot_react_native_span';

const BRIDGE_SCOPE: OtelScope = { name: '@elastic/otel-react-native' };
const INTERACTIONS_SCOPE: OtelScope = { name: '@elastic/otel-react-native.interactions' };
const NATIVE_INTERACTIONS_SCOPE: OtelScope = { name: 'co.elastic.otel.mobile.interactions' };
const SESSION_SCOPE: OtelScope = { name: 'io.opentelemetry.sessions' };
const APP_START_SCOPE: OtelScope = { name: 'co.elastic.otel.mobile.startup' };
const SCREEN_SCOPE: OtelScope = { name: 'co.elastic.otel.mobile.screen' };
const BACKEND_SCOPE: OtelScope = { name: 'io.opentelemetry.http-server' };
const ERRORS_SCOPE: OtelScope = { name: 'co.elastic.otel.mobile.errors' };
const SEVERITY_TEXT: Readonly<Record<number, string>> = {
  [SEVERITY_WARN]: 'WARN',
  [SEVERITY_ERROR]: 'ERROR',
  [SEVERITY_FATAL]: 'FATAL',
};

export type NetworkConnectionType = 'wifi' | 'cell' | 'unavailable' | 'unknown';

export interface NetworkConnection {
  type: NetworkConnectionType;
  /** The cellular technology, uppercase like both SDKs write it, e.g. `LTE` or `NR`. */
  subtype?: string;
  carrier?: { name: string; icc: string; mcc: string; mnc: string };
}

export interface EdotReactNativeClientOptions {
  /** Written as `resource.attributes.app.installation.id`. */
  installationId: string;
  /** Written as `attributes.session.id` on every log and span when set. */
  sessionId?: string;
  /** The iOS `identifierForVendor`, written as `device.id`. EDOT Android doesn't write it. */
  deviceId?: string;
  network?: NetworkConnection;
  /** Multiplies how long the device takes to launch and show screens. */
  slowdown?: number;
}

export interface HttpRequestOptions {
  method: string;
  url: string;
  /** Omitted for a request that got no response. */
  statusCode?: number;
  /** The exception class on Android, the runtime class of the error on iOS (e.g. `NSURLError`). */
  errorType?: string;
  /**
   * Written as `http.request.body.size`. Only EDOT iOS writes it: EDOT Android turns off the
   * experimental OkHttp telemetry that records body sizes.
   */
  requestBodySize?: number;
  /**
   * Written as `http.response.body.size` for a request that got a response. Only EDOT iOS writes
   * it: EDOT Android turns off the experimental OkHttp telemetry that records body sizes.
   */
  responseBodySize?: number;
  traceId?: string;
  spanId?: string;
  /** The span the request is a child of, e.g. the screen load span. */
  parentSpanId?: string;
}

export interface FreezeOptions {
  /** How long the main thread was blocked, in milliseconds. */
  durationMs: number;
}

export interface BackendSpanOptions {
  /** The `service.name` of the backend. */
  service: string;
  method: string;
  url: string;
  statusCode: number;
  traceId: string;
  /** The span id of the client span that called the backend. */
  parentSpanId: string;
  spanId?: string;
}

export interface HttpExceptionEventOptions {
  traceId: string;
  spanId: string;
  statusCode?: number;
  errorType?: string;
  errorMessage?: string;
}

export interface CrashOptions {
  type: string;
  message: string;
  stacktrace: string;
}

export interface SpanOptions {
  name: string;
  kind: EdotReactNativeSpanKind;
  scope: OtelScope;
  status?: EdotReactNativeSpanStatus;
  attributes: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  /** Replaces the app's resource attributes, for spans of other services. */
  resourceAttributes?: Record<string, unknown>;
}

/** The builders both platforms share; `EdotAndroidClient` and `EdotIosClient` follow their SDK. */
export abstract class EdotReactNativeClientBase {
  public abstract readonly platform: MobilePlatform;
  private memoizedResourceAttributes?: Readonly<Record<string, unknown>>;

  constructor(
    private readonly appResourceAttributes: Readonly<Record<string, unknown>>,
    protected readonly options: EdotReactNativeClientOptions,
    /** Android application ID and iOS bundle ID, which the SDKs don't write as an attribute. */
    protected readonly appId: string,
    /** Whether the app is built with the native SDK directly, without React Native. */
    public readonly native: boolean = false,
    /** The environment the app is configured with, which its backends share. */
    private readonly environment?: string
  ) {}

  /** Whether the SDK adds the cellular details to every span, not only to HTTP spans. */
  protected abstract readonly cellularOnAllSpans: boolean;

  /** How the SDK writes the UUIDs it generates. */
  protected abstract formatUuid(uuid: string): string;

  /** An HTTP request of the app's `fetch`. */
  abstract httpRequest(options: HttpRequestOptions): EdotReactNativeSpan;

  /** The `exception` span event of a failed HTTP request, or undefined when the SDK adds none. */
  abstract httpExceptionEvent(options: HttpExceptionEventOptions): EdotLog | undefined;

  /** A crash as the platform's crash reporter records it. */
  abstract crash(options: CrashOptions): EdotLog;

  /** The ERROR log of a frozen main thread: an ANR on Android, a hang on iOS. */
  abstract freeze(options: FreezeOptions): EdotLog;

  /** The device resource attributes the SDK adds itself. */
  protected deviceAttributes(): Record<string, string> {
    return {};
  }

  // Built lazily, as the constructor runs before the subclass fields are initialized
  protected get resourceAttributes(): Readonly<Record<string, unknown>> {
    this.memoizedResourceAttributes ??= {
      ...this.appResourceAttributes,
      'app.installation.id': this.formatUuid(this.options.installationId),
      ...this.deviceAttributes(),
    };
    return this.memoizedResourceAttributes;
  }

  /** The scope of the app's own spans and logs: the bridge, or the app's own tracer and logger. */
  private get appScope(): OtelScope {
    return this.native ? { name: this.appId } : BRIDGE_SCOPE;
  }

  private get interactionsScope(): OtelScope {
    return this.native ? NATIVE_INTERACTIONS_SCOPE : INTERACTIONS_SCOPE;
  }

  public get sessionId(): string | undefined {
    return this.options.sessionId ? this.formatUuid(this.options.sessionId) : undefined;
  }

  public get slowdown(): number {
    return this.options.slowdown ?? 1;
  }

  protected get network(): NetworkConnection {
    return this.options.network ?? { type: 'wifi' };
  }

  protected get cellularAttributes(): Record<string, string> {
    const { subtype, carrier } = this.network;
    return {
      ...(subtype ? { 'network.connection.subtype': subtype } : {}),
      ...(carrier
        ? {
            'network.carrier.name': carrier.name,
            'network.carrier.icc': carrier.icc,
            'network.carrier.mcc': carrier.mcc,
            'network.carrier.mnc': carrier.mnc,
          }
        : {}),
    };
  }

  /** What the SDK adds to every log record. */
  protected get logAttributes(): Record<string, string> {
    const { sessionId } = this;
    return {
      ...(sessionId ? { 'session.id': sessionId } : {}),
      'network.connection.type': this.network.type,
    };
  }

  /** What the SDK adds to every span. */
  protected spanAttributes(): Record<string, unknown> {
    return {
      ...this.logAttributes,
      type: 'mobile',
      ...(this.cellularOnAllSpans ? this.cellularAttributes : {}),
    };
  }

  /** What the SDK adds to every HTTP span. */
  protected httpSpanAttributes(): Record<string, unknown> {
    return { ...this.logAttributes, type: 'mobile', ...this.cellularAttributes };
  }

  protected log(
    scope: OtelScope,
    attributes: Record<string, unknown>,
    { eventName, severityNumber }: { eventName?: string; severityNumber?: number } = {}
  ): EdotLog {
    const log = new EdotLog({ _index: LOGS_INDEX })
      .scope(scope)
      .addResourceAttributes(this.resourceAttributes)
      .addAttributes(attributes);
    if (eventName) {
      log.eventName(eventName);
    }
    if (severityNumber !== undefined) {
      log.severity(severityNumber, SEVERITY_TEXT[severityNumber] ?? 'ERROR');
    }
    return log;
  }

  /** An `exception` span event, stored by the Elasticsearch exporter as a log linked to the span. */
  protected exceptionEvent(
    scope: OtelScope,
    exception: Record<string, string>,
    { traceId, spanId }: { traceId: string; spanId: string }
  ): EdotLog {
    return this.log(scope, exception, { eventName: EVENT_EXCEPTION }).traceContext({
      traceId,
      spanId,
    });
  }

  /** An exception the app caught and reported, as a WARN `exception` event without a span. */
  handledError({ type, message, stacktrace }: CrashOptions): EdotLog {
    return this.log(
      ERRORS_SCOPE,
      {
        'exception.type': type,
        'exception.message': message,
        'exception.stacktrace': stacktrace,
        ...this.logAttributes,
      },
      { eventName: EVENT_EXCEPTION, severityNumber: SEVERITY_WARN }
    );
  }

  protected span({
    name,
    kind,
    scope,
    status = MOBILE_SPAN_STATUS.UNSET,
    attributes,
    traceId = generateLongId(),
    spanId = generateShortId(),
    parentSpanId,
    resourceAttributes = this.resourceAttributes,
  }: SpanOptions): EdotReactNativeSpan {
    return new EdotSpan<EdotReactNativeSpanDocument>({
      _index: TRACES_INDEX,
      trace_id: traceId,
      span_id: spanId,
      ...(parentSpanId !== undefined ? { parent_span_id: parentSpanId } : {}),
      name,
      kind,
      status: { code: status },
      scope,
      resource: { attributes: { ...resourceAttributes } },
      attributes,
    });
  }

  /** The `exception.*` attributes of a frozen main thread, which each SDK words its own way. */
  protected freezeLog(
    scope: OtelScope,
    kind: FreezeKind,
    exception: { type: string; message: string; stacktrace: string }
  ): EdotLog {
    return this.log(
      scope,
      {
        'exception.type': exception.type,
        'exception.message': exception.message,
        'exception.stacktrace': exception.stacktrace,
        [ATTR_ERROR_KIND]: kind,
        ...this.logAttributes,
      },
      { severityNumber: SEVERITY_ERROR }
    );
  }

  /** A log event with the `otel.event.name` attribute and the event name. */
  private event(scope: OtelScope, name: string, attributes: Record<string, unknown> = {}): EdotLog {
    return this.log(
      scope,
      { 'otel.event.name': name, ...attributes, ...this.logAttributes },
      { eventName: name }
    );
  }

  /** The start of the session, with the previous session of the installation when there is one. */
  sessionStart({ previousSessionId }: { previousSessionId?: string } = {}): EdotLog {
    return this.event(
      SESSION_SCOPE,
      EVENT_SESSION_START,
      previousSessionId ? { [ATTR_SESSION_PREVIOUS_ID]: this.formatUuid(previousSessionId) } : {}
    );
  }

  sessionEnd(): EdotLog {
    return this.event(SESSION_SCOPE, EVENT_SESSION_END);
  }

  /** A launch of the app, with the time it took until the first screen, in milliseconds. */
  appStart({ type, durationMs }: { type: AppStartType; durationMs: number }): EdotLog {
    return this.event(APP_START_SCOPE, EVENT_APP_START, {
      [ATTR_START_TYPE]: type,
      [ATTR_APP_START_DURATION]: asFloat(durationMs),
    });
  }

  /** A tap that hit no widget. */
  screenClick(): EdotLog {
    return this.event(this.interactionsScope, EVENT_SCREEN_CLICK);
  }

  /** A screen loading, from the start of the view until it has appeared. */
  screenLoad({
    screenName,
    traceId,
    spanId,
  }: {
    screenName: string;
    traceId?: string;
    spanId?: string;
  }): EdotReactNativeSpan {
    return this.span({
      name: SPAN_SCREEN_LOAD,
      kind: MOBILE_SPAN_KIND.INTERNAL,
      scope: SCREEN_SCOPE,
      attributes: { ...this.spanAttributes(), [ATTR_SCREEN_NAME]: screenName },
      traceId,
      spanId,
    });
  }

  /** The SERVER span of a backend that answered a request of the app, in the app's environment. */
  backendSpan({
    service,
    method,
    url,
    statusCode,
    traceId,
    parentSpanId,
    spanId,
  }: BackendSpanOptions): EdotReactNativeSpan {
    const { pathname } = new URL(url);
    return this.span({
      name: `${method} ${pathname}`,
      kind: MOBILE_SPAN_KIND.SERVER,
      scope: BACKEND_SCOPE,
      status: statusCode >= 500 ? MOBILE_SPAN_STATUS.ERROR : MOBILE_SPAN_STATUS.UNSET,
      attributes: {
        'http.request.method': method,
        'url.path': pathname,
        'http.response.status_code': statusCode,
      },
      traceId,
      spanId,
      parentSpanId,
      resourceAttributes: {
        'service.name': service,
        ...(this.environment !== undefined
          ? { 'deployment.environment.name': this.environment }
          : {}),
      },
    });
  }

  /** A span the app creates itself, with `startSpan()` of the bridge or its own tracer. */
  manualSpan({
    name,
    traceId,
    spanId,
  }: {
    name: string;
    traceId?: string;
    spanId?: string;
  }): EdotReactNativeSpan {
    return this.span({
      name,
      kind: MOBILE_SPAN_KIND.INTERNAL,
      scope: this.appScope,
      attributes: this.spanAttributes(),
      traceId,
      spanId,
    });
  }

  /** An error log of the app, from `emitLog(message, 'error')` of the bridge or its own logger. */
  errorLog(message: string): EdotLog {
    return this.log(this.appScope, this.logAttributes, { severityNumber: SEVERITY_ERROR }).message(
      message
    );
  }

  /** A tap recorded by the Babel plugin of `@elastic/otel-react-native`, or `recordWidgetClick()`. */
  widgetClick({ id, name }: { id: string; name?: string }): EdotLog {
    return this.event(this.interactionsScope, EVENT_WIDGET_CLICK, {
      'app.widget.id': id,
      ...(name ? { 'app.widget.name': name } : {}),
    });
  }
}

/** One installation of an EDOT React Native app on one device; narrow it with `platform`. */
export type EdotReactNativeClient = EdotAndroidClient | EdotIosClient;
