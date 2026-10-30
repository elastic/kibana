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
import { LOGS_INDEX, SEVERITY_ERROR, SEVERITY_FATAL, TRACES_INDEX } from '../edot_shared/constants';
import { EdotLog } from '../edot_shared/edot_log';
import { EdotSpan } from '../edot_shared/edot_span';
import type { MobilePlatform } from './device_profiles';
import type { EdotAndroidClient } from './edot_android_client';
import type { EdotIosClient } from './edot_ios_client';
import type { EdotReactNativeSpan, EdotReactNativeSpanDocument } from './edot_react_native_span';

const BRIDGE_SCOPE: OtelScope = { name: '@elastic/otel-react-native' };
const INTERACTIONS_SCOPE: OtelScope = { name: '@elastic/otel-react-native.interactions' };

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
  /** The exception class on Android, the Swift error type on iOS. */
  errorType?: string;
  requestBodySize?: number;
  responseBodySize?: number;
  traceId?: string;
  spanId?: string;
  /**
   * Only the iOS session passes one, as EDOT iOS makes requests that start while a screen
   * appears children of its view span.
   */
  parentSpanId?: string;
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
  kind: 'Client' | 'Internal';
  scope: OtelScope;
  status?: 'Unset' | 'Ok' | 'Error';
  attributes: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

/** The builders both platforms share; `EdotAndroidClient` and `EdotIosClient` follow their SDK. */
export abstract class EdotReactNativeClientBase {
  public abstract readonly platform: MobilePlatform;
  private memoizedResourceAttributes?: Readonly<Record<string, unknown>>;

  constructor(
    private readonly appResourceAttributes: Readonly<Record<string, unknown>>,
    protected readonly options: EdotReactNativeClientOptions
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
      log.severity(severityNumber, severityNumber === SEVERITY_FATAL ? 'FATAL' : 'ERROR');
    }
    return log;
  }

  /** An `exception` span event, stored by the Elasticsearch exporter as a log linked to the span. */
  protected exceptionEvent(
    scope: OtelScope,
    exception: Record<string, string>,
    { traceId, spanId }: { traceId: string; spanId: string }
  ): EdotLog {
    return this.log(scope, exception, { eventName: 'exception' }).traceContext({ traceId, spanId });
  }

  protected span({
    name,
    kind,
    scope,
    status = 'Unset',
    attributes,
    traceId = generateLongId(),
    spanId = generateShortId(),
    parentSpanId,
  }: SpanOptions): EdotReactNativeSpan {
    return new EdotSpan<EdotReactNativeSpanDocument>({
      _index: TRACES_INDEX,
      trace_id: traceId,
      span_id: spanId,
      ...(parentSpanId ? { parent_span_id: parentSpanId } : {}),
      name,
      kind,
      status: { code: status },
      scope,
      resource: { attributes: { ...this.resourceAttributes } },
      attributes,
    });
  }

  /** A span the app creates itself with `startSpan()` of `@elastic/otel-react-native`. */
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
      kind: 'Internal',
      scope: BRIDGE_SCOPE,
      attributes: this.spanAttributes(),
      traceId,
      spanId,
    });
  }

  /** A log the app emits with `emitLog(message, 'error')` of `@elastic/otel-react-native`. */
  errorLog(message: string): EdotLog {
    return this.log(BRIDGE_SCOPE, this.logAttributes, { severityNumber: SEVERITY_ERROR }).message(
      message
    );
  }

  /** A tap recorded by the Babel plugin of `@elastic/otel-react-native`, or `recordWidgetClick()`. */
  widgetClick({ id, name }: { id: string; name?: string }): EdotLog {
    return this.log(
      INTERACTIONS_SCOPE,
      {
        'otel.event.name': 'app.widget.click',
        'app.widget.id': id,
        ...(name ? { 'app.widget.name': name } : {}),
        ...this.logAttributes,
      },
      { eventName: 'app.widget.click' }
    );
  }
}

/** One installation of an EDOT React Native app on one device; narrow it with `platform`. */
export type EdotReactNativeClient = EdotAndroidClient | EdotIosClient;
