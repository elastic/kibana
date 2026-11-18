/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom } from '../utils/seeded_random';
import type { OtelLogDocument } from '../otel_logs';
import { DEVICE_PROFILES, pickDeviceProfile, type DeviceProfileId } from './device_profiles';
import type { EdotAndroidClient } from './edot_android_client';
import type { EdotIosClient } from './edot_ios_client';
import type { NetworkConnection } from './edot_react_native_client';
import { ANDROID_MAX_SESSION_MS, SESSION_IDLE_TIMEOUT_MS } from './edot_react_native_session';
import type { EdotReactNativeSpanDocument } from './edot_react_native_span';
import { MOBILE_HEALTH_PROFILES, type MobileHealthProfile } from './health_profiles';
import {
  ATTR_APP_START_DURATION,
  ATTR_ERROR_KIND,
  ATTR_SCREEN_NAME,
  ATTR_SESSION_PREVIOUS_ID,
  ATTR_START_TYPE,
  ERROR_KIND_ANR,
  ERROR_KIND_HANG,
  EVENT_APP_START,
  EVENT_EXCEPTION,
  EVENT_SCREEN_CLICK,
  EVENT_SESSION_END,
  EVENT_SESSION_START,
  EVENT_WIDGET_CLICK,
  SPAN_SCREEN_LOAD,
  START_TYPE_COLD,
  START_TYPE_WARM,
} from '../edot_shared/proposed_signals';
import {
  edotReactNative,
  type EdotReactNativeAppModel,
  type EdotReactNativeDocument,
  type EdotReactNativeEvent,
} from '.';

const TIMESTAMP = new Date('2026-10-16T12:00:00.000Z').getTime();
const SESSION_ID = '6F9619FF-8B86-D011-B42D-00C04FC964FF';
const INSTALLATION_ID = 'A1B2C3D4-0000-4000-8000-000000000001';

const CELLULAR: NetworkConnection = {
  type: 'cell',
  subtype: 'LTE',
  carrier: { name: 'Example Mobile', icc: 'us', mcc: '310', mnc: '260' },
};

const app = edotReactNative.app({
  serviceName: 'weather-demo-react-native',
  serviceVersion: '1.4.0',
  environment: 'production',
  appId: 'co.elastic.weather',
  buildNumber: 42,
});

const nativeApp = edotReactNative.app({
  serviceName: 'trailmap',
  appId: 'com.example.trailmap',
  native: true,
});

interface ClientOptions {
  sessionId?: string;
  network?: NetworkConnection;
  native?: boolean;
}

const createClient = (
  profileId: DeviceProfileId,
  { sessionId = SESSION_ID, network, native }: ClientOptions = {}
) =>
  (native ? nativeApp : app).client(DEVICE_PROFILES[profileId], {
    installationId: INSTALLATION_ID,
    sessionId,
    deviceId: 'd2a6c1b0-0000-4000-8000-000000000002',
    network,
  });

const android = (options?: ClientOptions): EdotAndroidClient => {
  const client = createClient('pixel8Android15', options);
  if (client.platform !== 'android') {
    throw new Error('Expected an Android client');
  }
  return client;
};
const ios = (options?: ClientOptions): EdotIosClient => {
  const client = createClient('iphone15ProIos18', options);
  if (client.platform !== 'ios') {
    throw new Error('Expected an iOS client');
  }
  return client;
};

const APP_MODEL: EdotReactNativeAppModel = {
  screens: [
    {
      name: 'Cities',
      iosTitle: 'Cities',
      requests: [{ method: 'GET', url: 'https://api.example.com/v1/health' }],
      widgets: [
        {
          id: 'show-forecast',
          name: 'Show forecast',
          request: {
            method: 'GET',
            url: 'https://api.example.com/v1/forecast?city=New%20York',
            errorLog: 'Error while fetching forecast',
          },
        },
      ],
    },
    {
      name: 'Forecast',
      requests: [{ method: 'GET', url: 'https://api.example.com/v1/forecast?city=Berlin' }],
    },
  ],
};

const seededRandom = (seed: string) => createSeededRandom(`edot-react-native-test:${seed}`);

const serialize = (events: EdotReactNativeEvent[]): EdotReactNativeDocument[] =>
  events.flatMap((event) => event.serialize());

const isSpan = (doc: EdotReactNativeDocument): doc is EdotReactNativeSpanDocument =>
  'span_id' in doc && 'kind' in doc;

const logs = (docs: EdotReactNativeDocument[]): OtelLogDocument[] =>
  docs.filter((doc): doc is OtelLogDocument => !isSpan(doc));

const timeOf = (doc: EdotReactNativeDocument): number => Number(doc['@timestamp']);

const withHealth = (overrides: Partial<MobileHealthProfile>): MobileHealthProfile => ({
  ...MOBILE_HEALTH_PROFILES.healthy,
  networkErrorRate: 0,
  httpFailureRate: 0,
  errorLogRate: 0,
  crashRate: 0,
  ...overrides,
});

const simulate = ({
  platform,
  health = withHealth({}),
  seed = 'session',
  screenViews = 4,
  visits = 1,
  manualSpans,
  sessionId,
  model = APP_MODEL,
  native,
  proposedSignals,
  previousSessionId,
}: {
  platform: 'android' | 'ios';
  health?: MobileHealthProfile;
  seed?: string;
  screenViews?: number;
  visits?: number;
  manualSpans?: { launch?: boolean; screens?: boolean };
  sessionId?: string;
  model?: EdotReactNativeAppModel;
  native?: boolean;
  proposedSignals?: boolean;
  previousSessionId?: string;
}) =>
  serialize(
    edotReactNative.session({
      client: platform === 'ios' ? ios({ sessionId, native }) : android({ sessionId, native }),
      app: model,
      health,
      screenViews,
      visits,
      manualSpans,
      proposedSignals,
      previousSessionId,
      start: TIMESTAMP,
      random: seededRandom(seed),
    })
  );

describe('edotReactNative', () => {
  describe('device profiles', () => {
    it('describes Android and iOS devices the way their SDK does', () => {
      Object.values(DEVICE_PROFILES).forEach(({ platform, resourceAttributes }) => {
        if (platform === 'android') {
          expect(resourceAttributes['os.name']).toBe('Android');
          expect(resourceAttributes['os.type']).toBeUndefined();
          expect(resourceAttributes['device.manufacturer']).toBeDefined();
          expect(resourceAttributes['os.description']).toMatch(
            /^Android \d+, API level \d+, BUILD/
          );
        } else {
          expect(resourceAttributes['os.type']).toBe('darwin');
          expect(['iOS', 'iPadOS']).toContain(resourceAttributes['os.name']);
          expect(resourceAttributes['os.version']).toMatch(/^\d+\.\d+\.\d+$/);
          expect(resourceAttributes['process.runtime.name']).toBe(resourceAttributes['os.name']);
        }
      });
    });

    it('picks only profiles of the requested platforms', () => {
      const random = seededRandom('profiles');
      for (let i = 0; i < 50; i++) {
        expect(pickDeviceProfile(random, {}, ['ios'])?.platform).toBe('ios');
      }
    });

    it('picks nothing when no profile is left', () => {
      expect(
        pickDeviceProfile(
          Math.random,
          { iphone15ProIos18: 0, iphone12Ios17: 0, ipadAirIpados18: 0 },
          ['ios']
        )
      ).toBeUndefined();
    });
  });

  describe('signal builders', () => {
    it('writes the EDOT Android resource attributes', () => {
      const [doc] = android().errorLog('boom').timestamp(TIMESTAMP).serialize();
      expect(doc.resource?.attributes).toEqual(
        expect.objectContaining({
          'service.name': 'weather-demo-react-native',
          'service.version': '1.4.0',
          'deployment.environment.name': 'production',
          'telemetry.sdk.name': 'android',
          'telemetry.sdk.language': 'java',
          'telemetry.sdk.version': '1.10.0',
          'app.installation.id': INSTALLATION_ID.toLowerCase(),
          'os.name': 'Android',
          'device.model.identifier': 'Pixel 8',
        })
      );
      expect(doc.resource?.attributes?.['app.build_id']).toMatch(/^[0-9a-f]{64}$/);
      expect(doc.resource?.attributes?.['device.id']).toBeUndefined();
      expect(doc.resource?.attributes?.['telemetry.distro.name']).toBeUndefined();
    });

    it('writes the EDOT iOS resource attributes', () => {
      const [doc] = ios().errorLog('boom').timestamp(TIMESTAMP).serialize();
      expect(doc.resource?.attributes).toEqual(
        expect.objectContaining({
          'telemetry.sdk.name': 'iOS',
          'telemetry.sdk.language': 'swift',
          'telemetry.sdk.version': '2.3.0',
          'app.build_id': '42',
          'app.installation.id': INSTALLATION_ID.toUpperCase(),
          'device.id': 'D2A6C1B0-0000-4000-8000-000000000002',
          'os.type': 'darwin',
        })
      );
    });

    it('defaults the environment to `default` on iOS only', () => {
      const appWithoutEnvironment = edotReactNative.app({ serviceName: 'internal-tools' });
      const [iosDoc] = appWithoutEnvironment
        .client(DEVICE_PROFILES.iphone12Ios17, { installationId: INSTALLATION_ID })
        .errorLog('boom')
        .serialize();
      const [androidDoc] = appWithoutEnvironment
        .client(DEVICE_PROFILES.galaxyS23Android14, { installationId: INSTALLATION_ID })
        .errorLog('boom')
        .serialize();
      expect(iosDoc.resource?.attributes?.['deployment.environment.name']).toBe('default');
      expect(androidDoc.resource?.attributes).not.toHaveProperty('deployment.environment.name');
    });

    it('writes session IDs lowercase on Android and uppercase on iOS', () => {
      const [androidDoc] = android().errorLog('boom').serialize();
      const [iosDoc] = ios({ sessionId: SESSION_ID.toLowerCase() }).errorLog('boom').serialize();
      expect(androidDoc.attributes?.['session.id']).toBe(SESSION_ID.toLowerCase());
      expect(iosDoc.attributes?.['session.id']).toBe(SESSION_ID);
    });

    it('writes OkHttp CLIENT spans named after the method and host on Android', () => {
      const [span] = android()
        .httpRequest({
          method: 'GET',
          url: 'https://api.example.com/v1/forecast?city=Berlin',
          statusCode: 200,
        })
        .timestamp(TIMESTAMP)
        .duration(120.5)
        .serialize() as EdotReactNativeSpanDocument[];

      expect(span).toEqual(
        expect.objectContaining({
          _index: 'traces-generic.otel-default',
          name: 'GET api.example.com',
          kind: 'Client',
          status: { code: 'Unset' },
          duration: 120_500_000,
          scope: { name: 'io.opentelemetry.okhttp-3.0', version: '2.31.1-alpha' },
        })
      );
      expect(span.attributes).toEqual(
        expect.objectContaining({
          'http.request.method': 'GET',
          'url.full': 'https://api.example.com/v1/forecast?city=Berlin',
          'server.address': 'api.example.com',
          'server.port': 443,
          'http.response.status_code': 200,
          'network.protocol.version': '2',
          'session.id': SESSION_ID.toLowerCase(),
          'network.connection.type': 'wifi',
          type: 'mobile',
        })
      );
      expect(span.attributes).not.toHaveProperty('error.type');
    });

    it('sanitizes the URL of OkHttp spans and names them after what precedes its path', () => {
      const spanOf = (url: string) =>
        (
          android()
            .httpRequest({ method: 'GET', url, statusCode: 200 })
            .serialize() as EdotReactNativeSpanDocument[]
        )[0];

      const withCredentials = spanOf('https://user:secret@api.example.com:8443/v1/files');
      expect(withCredentials.attributes['url.full']).toBe(
        'https://REDACTED:REDACTED@api.example.com:8443/v1/files'
      );
      expect(withCredentials.name).toBe('GET REDACTED:REDACTED@api.example.com:8443');
      expect(spanOf('https://user@api.example.com/').attributes['url.full']).toBe(
        'https://REDACTED:REDACTED@api.example.com/'
      );

      const signed = spanOf(
        'https://bucket.s3.amazonaws.com/a.jpg?X-Amz-Credential=AKIA&X-Amz-Signature=abc&x-amz-signature=def&sig=&size=large'
      );
      expect(signed.attributes['url.full']).toBe(
        'https://bucket.s3.amazonaws.com/a.jpg?X-Amz-Credential=REDACTED&X-Amz-Signature=REDACTED&x-amz-signature=def&sig=REDACTED&size=large'
      );
      expect(signed.name).toBe('GET bucket.s3.amazonaws.com');
      // Like OkHttp, the URL always has a path
      expect(spanOf('https://api.example.com?Signature=abc').attributes['url.full']).toBe(
        'https://api.example.com/?Signature=REDACTED'
      );
    });

    it('writes URLSession CLIENT spans without the port unless the URL has one on iOS', () => {
      const [span] = ios()
        .httpRequest({
          method: 'POST',
          url: 'https://api.example.com/v1/orders',
          statusCode: 201,
          requestBodySize: 512,
          responseBodySize: 64,
        })
        .serialize() as EdotReactNativeSpanDocument[];
      const [withPort] = ios()
        .httpRequest({ method: 'GET', url: 'http://localhost:8080/v1/health', statusCode: 200 })
        .serialize() as EdotReactNativeSpanDocument[];

      expect(span.name).toBe('POST api.example.com');
      expect(span.scope).toEqual({ name: 'NSURLSession', version: '1.0.0' });
      expect(span.attributes).toEqual(
        expect.objectContaining({
          'url.path': '/v1/orders',
          'url.scheme': 'https',
          'http.request.body.size': 512,
          'http.response.body.size': 64,
          'http.response.status_code': 201,
        })
      );
      expect(span.attributes).not.toHaveProperty('server.port');
      expect(withPort.name).toBe('GET localhost');
      expect(withPort.attributes['server.port']).toBe(8080);
    });

    it('writes HTTP errors the way each platform does', () => {
      const request = {
        method: 'GET',
        url: 'https://api.example.com/v1/forecast',
        statusCode: 500,
      };
      const ids = { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) };

      const [androidSpan] = android()
        .httpRequest({ ...request, ...ids })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(androidSpan.status.code).toBe('Error');
      expect(androidSpan.attributes['error.type']).toBe('500');
      expect(android().httpExceptionEvent({ ...ids, statusCode: 500 })).toBeUndefined();

      const [iosSpan] = ios()
        .httpRequest({ ...request, ...ids })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(iosSpan.status.code).toBe('Error');
      expect(iosSpan.attributes).not.toHaveProperty('error.type');
      const [iosEvent] =
        ios()
          .httpExceptionEvent({ ...ids, statusCode: 500 })
          ?.serialize() ?? [];
      expect(iosEvent).toEqual(
        expect.objectContaining({
          _index: 'logs-generic.otel-default',
          event_name: 'exception',
          trace_id: ids.traceId,
          span_id: ids.spanId,
          attributes: { 'exception.type': '500', 'exception.message': 'internal server error' },
        })
      );
    });

    it('writes transport errors with an error type and an exception event on both platforms', () => {
      const ids = { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) };
      const [androidSpan] = android()
        .httpRequest({
          method: 'GET',
          url: 'https://api.example.com/',
          errorType: 'java.net.SocketTimeoutException',
          ...ids,
        })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(androidSpan.attributes['error.type']).toBe('java.net.SocketTimeoutException');
      expect(androidSpan.attributes).not.toHaveProperty('http.response.status_code');
      const [androidEvent] =
        android()
          .httpExceptionEvent({
            ...ids,
            errorType: 'java.net.SocketTimeoutException',
            errorMessage: 'timeout',
          })
          ?.serialize() ?? [];
      expect(androidEvent.attributes?.['exception.stacktrace']).toContain('SocketTimeoutException');

      const [iosSpan] = ios()
        .httpRequest({
          method: 'GET',
          url: 'https://api.example.com/',
          errorType: 'NSURLError',
          ...ids,
        })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(iosSpan.status.code).toBe('Error');
      expect(iosSpan.attributes['error.type']).toBe('NSURLError');
    });

    it('falls back to the status class for iOS status codes without a text of their own', () => {
      const ids = { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) };
      const messageOf = (statusCode: number) =>
        ios()
          .httpExceptionEvent({ ...ids, statusCode })
          ?.serialize()[0].attributes?.['exception.message'];
      expect(messageOf(404)).toBe('not found');
      expect(messageOf(422)).toBe('client error');
      expect(messageOf(507)).toBe('server error');
    });

    it('writes the default port of the scheme on Android, and none for unknown schemes', () => {
      const portOf = (url: string) => {
        const [span] = android()
          .httpRequest({ method: 'GET', url, statusCode: 200 })
          .serialize() as EdotReactNativeSpanDocument[];
        return [span.attributes['server.port'], span.attributes['network.peer.port']];
      };
      expect(portOf('http://api.example.com/')).toEqual([80, 80]);
      expect(portOf('wss://api.example.com/socket')).toEqual([443, 443]);
      expect(portOf('http://localhost:8080/')).toEqual([8080, 8080]);
      expect(portOf('ftp://files.example.com/report.csv')).toEqual([undefined, undefined]);
    });

    it('only adds cellular details to HTTP spans on iOS, and to all spans and logs on Android', () => {
      const request = { method: 'GET', url: 'https://api.example.com/', statusCode: 200 };
      const [iosHttp] = ios({ network: CELLULAR })
        .httpRequest(request)
        .serialize() as EdotReactNativeSpanDocument[];
      const [iosView] = ios({ network: CELLULAR })
        .viewAppearing({ title: 'Cities' })
        .serialize() as EdotReactNativeSpanDocument[];
      const [iosLog] = ios({ network: CELLULAR }).errorLog('boom').serialize();
      expect(iosHttp.attributes).toEqual(
        expect.objectContaining({
          'network.connection.subtype': 'LTE',
          'network.carrier.mcc': '310',
        })
      );
      expect(iosView.attributes).not.toHaveProperty('network.connection.subtype');
      expect(iosLog.attributes).not.toHaveProperty('network.connection.subtype');

      const [androidSpan] = android({ network: CELLULAR })
        .manualSpan({ name: 'checkout' })
        .serialize() as EdotReactNativeSpanDocument[];
      const [androidLog] = android({ network: CELLULAR }).errorLog('boom').serialize();
      expect(androidSpan.attributes).toEqual(
        expect.objectContaining({
          'network.connection.subtype': 'LTE',
          'network.carrier.name': 'Example Mobile',
        })
      );
      expect(androidLog.attributes).toEqual(
        expect.objectContaining({ 'network.connection.subtype': 'LTE' })
      );
      expect(androidLog.attributes).not.toHaveProperty('network.carrier.name');
    });

    it('writes iOS screens as view controller spans and lifecycle events', () => {
      const [span] = ios()
        .viewAppearing({ title: 'Cities' })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(span).toEqual(
        expect.objectContaining({
          name: 'Cities - view appearing',
          kind: 'Client',
          status: { code: 'Ok' },
          scope: { name: 'UIViewController', version: '0.0.3' },
        })
      );
      const [lifecycle] = ios().lifecycle('foreground').serialize();
      expect(lifecycle).toEqual(
        expect.objectContaining({
          event_name: 'device.app.lifecycle',
          scope: { name: 'ApplicationLifecycle' },
        })
      );
      expect(lifecycle.attributes?.['ios.app.state']).toBe('foreground');
      expect(lifecycle).not.toHaveProperty('severity_number');
    });

    it('writes manual spans, error logs and widget clicks with the bridge scopes', () => {
      const [span] = android()
        .manualSpan({ name: 'app.launch' })
        .serialize() as EdotReactNativeSpanDocument[];
      expect(span).toEqual(
        expect.objectContaining({ kind: 'Internal', scope: { name: '@elastic/otel-react-native' } })
      );

      const [errorLog] = android().errorLog('Error while fetching forecast').serialize();
      expect(errorLog).toEqual(
        expect.objectContaining({
          scope: { name: '@elastic/otel-react-native' },
          severity_number: 17,
          severity_text: 'ERROR',
          body: { text: 'Error while fetching forecast' },
        })
      );
      expect(errorLog).not.toHaveProperty('event_name');

      const [click] = ios().widgetClick({ id: 'show-forecast', name: 'Show forecast' }).serialize();
      expect(click).toEqual(
        expect.objectContaining({
          event_name: 'app.widget.click',
          scope: { name: '@elastic/otel-react-native.interactions' },
        })
      );
      expect(click.attributes).toEqual(
        expect.objectContaining({
          'otel.event.name': 'app.widget.click',
          'app.widget.id': 'show-forecast',
          'app.widget.name': 'Show forecast',
          'session.id': SESSION_ID,
        })
      );
      expect(click).not.toHaveProperty('body');
    });

    it('keeps the observed time whether it is set before or after the timestamp', () => {
      const crash = { type: 'SIGABRT', message: '#0 at 4339548160', stacktrace: '...' };
      const [observedFirst] = ios()
        .crash(crash)
        .observedAt(TIMESTAMP - 60_000)
        .timestamp(TIMESTAMP)
        .serialize();
      expect(observedFirst['@timestamp']).toBe(TIMESTAMP);
      expect(observedFirst.observed_timestamp).toBe(TIMESTAMP - 60_000);

      const [log] = ios().errorLog('Image failed to load').timestamp(TIMESTAMP).serialize();
      expect(log.observed_timestamp).toBe(TIMESTAMP);
    });

    it('writes crashes the way each platform does', () => {
      const crash = { type: 'SIGABRT', message: '#0 at 4339548160', stacktrace: '...' };
      const [iosCrash] = ios({ network: CELLULAR })
        .crash(crash)
        .timestamp(TIMESTAMP)
        .observedAt(TIMESTAMP - 60_000)
        .serialize();
      expect(iosCrash).toEqual(
        expect.objectContaining({
          event_name: 'app.crash',
          scope: { name: 'PLCrashReporter', version: '0.0.3' },
          severity_number: 21,
          severity_text: 'FATAL',
          '@timestamp': TIMESTAMP,
          observed_timestamp: TIMESTAMP - 60_000,
        })
      );
      expect(iosCrash.attributes).toEqual({
        'exception.type': 'SIGABRT',
        'exception.message': '#0 at 4339548160',
        'exception.stacktrace': '...',
        'session.id': SESSION_ID,
        'network.connection.type': 'cell',
      });

      const [androidCrash] = android()
        .crash({ ...crash, type: 'java.lang.IllegalStateException' })
        .serialize();
      expect(androidCrash).toEqual(
        expect.objectContaining({
          event_name: 'app.crash',
          scope: { name: 'co.elastic.otel.android.instrumentation.crash' },
        })
      );
      expect(androidCrash).not.toHaveProperty('severity_number');
      expect(androidCrash.attributes?.['otel.event.name']).toBe('app.crash');
    });
  });

  describe('session', () => {
    it('rejects an app without screens with a descriptive error', () => {
      expect(() =>
        edotReactNative.session({
          client: android(),
          app: { screens: [] },
          health: withHealth({}),
          screenViews: 1,
          start: TIMESTAMP,
        })
      ).toThrow('at least one screen');
    });

    it('stamps the same session.id on every span and log, and links span events to their span', () => {
      for (const platform of ['android', 'ios'] as const) {
        const docs = simulate({
          platform,
          health: withHealth({ errorLogRate: 1, httpFailureRate: 0.5, networkErrorRate: 0.2 }),
          screenViews: 8,
        });
        const isSpanEvent = (doc: EdotReactNativeDocument) =>
          !isSpan(doc) && doc.event_name === 'exception';
        const spanEvents = docs.filter(isSpanEvent);
        expect(spanEvents.length).toBeGreaterThan(0);

        const ids = new Set(
          docs.filter((doc) => !isSpanEvent(doc)).map((doc) => doc.attributes?.['session.id'])
        );
        expect(ids.size).toBe(1);

        // Like the Elasticsearch exporter stores span events: no session, but the span's IDs
        const spans = docs.filter(isSpan);
        spanEvents.forEach((event) => {
          expect(event.attributes).not.toHaveProperty('session.id');
          expect(
            spans.some(
              ({ trace_id: traceId, span_id: spanId }) =>
                traceId === event.trace_id && spanId === event.span_id
            )
          ).toBe(true);
        });
      }
    });

    it('launches the app cold again after a crash', () => {
      const docs = simulate({
        platform: 'android',
        health: withHealth({ crashRate: 1 }),
        screenViews: 4,
        visits: 2,
        manualSpans: { launch: true },
      });
      const launches = docs.filter(isSpan).filter(({ name }) => name === 'app.launch');
      expect(launches).toHaveLength(2);
      // A cold launch takes as long as the first one, not a quarter of it like a warm one
      const [first, second] = launches.map(({ duration }) => Number(duration));
      expect(second).toBeGreaterThan(first / 3);
    });

    it('records screens and the lifecycle only on iOS, unless the app creates spans itself', () => {
      const iosDocs = simulate({ platform: 'ios' });
      const iosSpanNames = iosDocs.filter(isSpan).map(({ name }) => name);
      expect(iosSpanNames).toContain('UIViewController - view appearing');
      expect(iosSpanNames).toContain('Cities - view appearing');
      expect(logs(iosDocs).map(({ event_name: eventName }) => eventName)).toContain(
        'device.app.lifecycle'
      );

      const androidDocs = simulate({ platform: 'android' });
      expect(androidDocs.filter(isSpan).every(({ kind }) => kind === 'Client')).toBe(true);
      expect(androidDocs.filter(isSpan).some(({ name }) => name.endsWith('view appearing'))).toBe(
        false
      );

      const withManualSpans = simulate({
        platform: 'android',
        manualSpans: { launch: true, screens: true },
      });
      const manualNames = withManualSpans
        .filter(isSpan)
        .filter(({ kind }) => kind === 'Internal')
        .map(({ name }) => name);
      expect(manualNames[0]).toBe('app.launch');
      expect(manualNames).toContain('Cities');
    });

    it('makes every HTTP span the root of its own trace', () => {
      (['ios', 'android'] as const).forEach((platform) => {
        const spans = simulate({ platform, screenViews: 6 }).filter(isSpan);
        const httpSpans = spans.filter(({ kind }) => kind === 'Client');
        expect(httpSpans.length).toBeGreaterThan(0);
        httpSpans.forEach((span) => {
          expect(span.parent_span_id).toBeUndefined();
          expect(spans.filter(({ trace_id: traceId }) => traceId === span.trace_id)).toHaveLength(
            1
          );
        });
      });
    });

    it('starts sessions at start or ends them at end', () => {
      const options = {
        client: android(),
        app: APP_MODEL,
        health: withHealth({}),
        screenViews: 3,
        // The launch span starts with the session
        manualSpans: { launch: true },
      };
      const started = serialize(
        edotReactNative.session({ ...options, start: TIMESTAMP, random: seededRandom('anchor') })
      );
      const ended = serialize(
        edotReactNative.session({ ...options, end: TIMESTAMP, random: seededRandom('anchor') })
      );
      const times = (docs: EdotReactNativeDocument[]) => docs.map(timeOf);
      expect(Math.min(...times(started))).toBe(TIMESTAMP);
      expect(Math.max(...times(ended))).toBeLessThanOrEqual(TIMESTAMP);
    });

    it('keeps the visits of a session less than 30 minutes apart', () => {
      const docs = simulate({ platform: 'ios', screenViews: 6, visits: 3 });
      const times = docs.map(timeOf).sort((a, b) => a - b);
      const gaps = times.slice(1).map((time, i) => time - times[i]);
      expect(Math.max(...gaps)).toBeLessThan(SESSION_IDLE_TIMEOUT_MS);
      expect(
        logs(docs).filter((doc) => doc.attributes?.['ios.app.state'] === 'foreground')
      ).toHaveLength(2);
    });

    it('ends EDOT Android sessions after 4 hours', () => {
      const docs = simulate({
        platform: 'android',
        screenViews: 40,
        visits: 20,
      });
      const times = docs.map(timeOf);
      expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(ANDROID_MAX_SESSION_MS);
    });

    it('lets requests run on after their screen, until the user leaves the app', () => {
      const latencyMs = 3_000;
      const docs = serialize(
        edotReactNative.session({
          client: ios(),
          app: APP_MODEL,
          health: withHealth({ httpLatency: { median: latencyMs, sigma: 0 } }),
          screenViews: 6,
          dwell: { median: 1_000, sigma: 0 },
          start: TIMESTAMP,
          random: seededRandom('requests-outlive-screens'),
        })
      );
      // The user leaves the app at the end of the visit, which sends it to the background
      const sessionEnd = Math.max(...docs.map(timeOf));
      expect(
        logs(docs).find((doc) => doc.attributes?.['ios.app.state'] === 'background')?.['@timestamp']
      ).toBe(sessionEnd);
      // iOS view spans are CLIENT spans too
      const requestSpans = docs
        .filter(isSpan)
        .filter(({ attributes }) => attributes['url.full'] !== undefined);
      const endOf = (span: EdotReactNativeSpanDocument) =>
        timeOf(span) + (span.duration ?? 0) / 1_000_000;
      requestSpans.forEach((span) => {
        expect(endOf(span)).toBeLessThanOrEqual(sessionEnd);
        // Only the end of the visit cuts a request short
        if (timeOf(span) + latencyMs <= sessionEnd) {
          expect(span.duration).toBe(latencyMs * 1_000_000);
        }
      });
      expect(requestSpans.filter(({ duration }) => duration === latencyMs * 1_000_000).length).toBe(
        requestSpans.length - requestSpans.filter((span) => endOf(span) === sessionEnd).length
      );
    });

    it('logs an error when a request with an error log fails', () => {
      const docs = simulate({
        platform: 'android',
        health: withHealth({ httpFailureRate: 1 }),
        screenViews: 8,
      });
      const errorLogs = logs(docs).filter(({ severity_text: severity }) => severity === 'ERROR');
      expect(errorLogs.length).toBeGreaterThan(0);
      errorLogs.forEach(({ body }) =>
        expect(body?.text).toMatch(/^Error while fetching forecast: HTTP 50\d$/)
      );
    });

    it('fails requests with a 5xx status code when they have no failure status codes', () => {
      const request = { method: 'GET', url: 'https://api.example.com/v1/forecast' };
      const docs = serialize(
        edotReactNative.session({
          client: android(),
          app: {
            screens: [
              {
                name: 'Forecast',
                requests: [{ ...request, failureStatusCodes: [], errorLog: 'Forecast failed' }],
              },
            ],
          },
          health: withHealth({ httpFailureRate: 1 }),
          screenViews: 4,
          start: TIMESTAMP,
          random: seededRandom('no-failure-status-codes'),
        })
      );
      const requestSpans = docs.filter(isSpan).filter(({ kind }) => kind === 'Client');
      expect(requestSpans).toHaveLength(4);
      requestSpans.forEach(({ status, attributes }) => {
        expect(status.code).toBe('Error');
        expect(attributes['http.response.status_code']).toBeGreaterThanOrEqual(500);
      });
      const errorLogs = logs(docs).filter(({ severity_text: severity }) => severity === 'ERROR');
      expect(errorLogs).toHaveLength(4);
      errorLogs.forEach(({ body }) => expect(body?.text).toMatch(/^Forecast failed: HTTP 50\d$/));
    });

    it('writes an Android crash when it happens and ends the session with it', () => {
      const docs = simulate({ platform: 'android', health: withHealth({ crashRate: 1 }) });
      const crashes = logs(docs).filter(({ event_name: eventName }) => eventName === 'app.crash');
      expect(crashes).toHaveLength(1);
      expect(crashes[0]['@timestamp']).toBe(Math.max(...docs.map(timeOf)));
    });

    it('loses what the SDK had not exported yet when the app crashes', () => {
      // Slow requests that all fail, so that some still run at the crash and have span events
      const health = withHealth({
        crashRate: 1,
        httpFailureRate: 1,
        errorLogRate: 1,
        httpLatency: { median: 3_000, sigma: 1 },
      });
      (['android', 'ios'] as const).forEach((platform) => {
        for (let i = 0; i < 20; i++) {
          const docs = simulate({
            platform,
            seed: `lost-at-crash-${i}`,
            health,
            manualSpans: { screens: true },
          });
          const [crash] = logs(docs).filter(
            ({ event_name: eventName }) => eventName === 'app.crash'
          );
          const crashedAt = Number(crash.observed_timestamp);
          const spans = docs.filter(isSpan);
          expect(spans.filter(({ kind }) => kind === 'Client').length).toBeGreaterThan(0);

          // Neither the crashed screen's span nor its running requests end at the crash
          spans
            .filter((span) => timeOf(span) < crashedAt)
            .forEach((span) => {
              expect(timeOf(span) + (span.duration ?? 0) / 1_000_000).toBeLessThan(crashedAt);
            });

          // Nothing happens between the crash and the relaunch
          const afterCrash = docs.filter(
            (doc) => doc !== crash && timeOf(doc) >= crashedAt && timeOf(doc) < crashedAt + 60_000
          );
          expect(afterCrash).toEqual([]);
          // Span events are kept or lost with their span, whatever happens to the logs
          const spanIds = new Set(spans.map(({ span_id: spanId }) => spanId));
          const spanEventIds = new Set(
            logs(docs)
              .filter(({ span_id: spanId }) => spanId !== undefined)
              .map(({ span_id: spanId }) => String(spanId))
          );
          spanEventIds.forEach((spanId) => expect(spanIds.has(spanId)).toBe(true));
          if (platform === 'ios') {
            // Every failed request has an exception event on iOS
            spans
              .filter(({ kind, status }) => kind === 'Client' && status.code === 'Error')
              .forEach(({ span_id: spanId }) => expect(spanEventIds.has(spanId)).toBe(true));
          }
        }
      });
    });

    it('writes an iOS crash on the next launch, observed when it happened', () => {
      const docs = simulate({ platform: 'ios', health: withHealth({ crashRate: 1 }) });
      const [crash] = logs(docs).filter(({ event_name: eventName }) => eventName === 'app.crash');
      expect(crash.observed_timestamp).toBeLessThan(timeOf(crash));
      // The relaunch reports it, with the cold launch of the root view controller
      const relaunchViews = docs
        .filter(isSpan)
        .filter(({ name }) => name === 'UIViewController - view appearing');
      expect(relaunchViews).toHaveLength(2);
      expect(relaunchViews[1]['@timestamp']).toBeGreaterThan(Number(crash.observed_timestamp));
    });

    it('reports iOS crashes as BSD signals, as PLCrashReporter does', () => {
      const crashTypes = new Set(
        Array.from({ length: 30 }, (_, i) =>
          logs(
            simulate({ platform: 'ios', seed: `signal-${i}`, health: withHealth({ crashRate: 1 }) })
          )
            .filter(({ event_name: eventName }) => eventName === 'app.crash')
            .map(({ attributes }) => attributes?.['exception.type'])
        ).flat()
      );
      expect(crashTypes.size).toBeGreaterThan(1);
      crashTypes.forEach((type) => expect(type).toMatch(/^SIG[A-Z]+$/));
    });

    it('writes an iOS crash report like EDOT iOS cuts down the PLCrashReporter one', () => {
      const reports = Array.from({ length: 40 }, (_, i) =>
        logs(
          simulate({ platform: 'ios', seed: `report-${i}`, health: withHealth({ crashRate: 1 }) })
        )
          .filter(({ event_name: eventName }) => eventName === 'app.crash')
          .map(({ attributes }) => ({
            type: String(attributes?.['exception.type']),
            message: String(attributes?.['exception.message']),
            stacktrace: String(attributes?.['exception.stacktrace']),
          }))
      ).flat();
      expect(new Set(reports.map(({ type }) => type))).toEqual(
        new Set(['SIGABRT', 'SIGSEGV', 'SIGBUS'])
      );

      reports.forEach(({ type, message, stacktrace }) => {
        expect(stacktrace.length).toBeLessThanOrEqual(7_500);
        expect(stacktrace).toMatch(/^Incident Identifier: [0-9A-F-]{36}\n/);
        expect(stacktrace).toContain('\nHardware Model:      iPhone16,1\n');
        expect(stacktrace).toContain('\nIdentifier:      co.elastic.weather\n');
        expect(stacktrace).toContain('\nVersion:         1.4.0 (42)\n');
        expect(stacktrace).toContain('\nOS Version:      iPhone OS 18.1 (22B83)\n');
        expect(stacktrace).toContain(`\nException Type:  ${type}\n`);
        // The message has the address in decimal, the report in hex
        const [, code, address] = /^(\S+) at (\d+)$/.exec(message) ?? [];
        expect(stacktrace).toContain(
          `\nException Codes: ${code} at 0x${Number(address).toString(16)}\n`
        );
        // Uncaught exceptions of RCTFatal abort the app
        expect(stacktrace.includes('Last Exception Backtrace:')).toBe(type === 'SIGABRT');
        expect(stacktrace).not.toContain('Thread State');

        // Binary images are those the frames point into
        const [threads, images] = stacktrace.split('\nBinary Images:\n');
        const frameImages = new Set(
          [...threads.matchAll(/^\d+ +(\S+) +0x[0-9a-f]{16} 0x[0-9a-f]+ \+ \d+$/gm)].map(
            ([, image]) => image
          )
        );
        const listedImages = images
          .trim()
          .split('\n')
          .map((line) => line.trim().split(/\s+/)[3].replace(/^\+/, ''));
        expect(new Set(listedImages)).toEqual(frameImages);
        expect(listedImages).toContain('WeatherDemoReactNative');
      });
    });

    it('relaunches the app after an iOS crash without crashing again', () => {
      const dwell = 10_000;
      for (const seed of ['relaunch-a', 'relaunch-b', 'relaunch-c']) {
        const docs = serialize(
          edotReactNative.session({
            client: ios(),
            app: APP_MODEL,
            health: withHealth({ crashRate: 1 }),
            screenViews: 2,
            dwell: { median: dwell, sigma: 0 },
            start: TIMESTAMP,
            random: seededRandom(seed),
          })
        );
        expect(
          logs(docs).filter(({ event_name: eventName }) => eventName === 'app.crash')
        ).toHaveLength(1);
        // The relaunch opens on the first screen, where the user stays the full dwell time
        const relaunchView = docs
          .filter(isSpan)
          .filter(({ name }) => name === 'Cities - view appearing')
          .pop();
        const background = logs(docs).find(
          (doc) => doc.attributes?.['ios.app.state'] === 'background'
        );
        if (!relaunchView || !background) {
          throw new Error(`Seed ${seed}: expected a relaunch view and a background event`);
        }
        const appeared = timeOf(relaunchView) + Number(relaunchView.duration) / 1_000_000;
        expect(timeOf(background) - appeared).toBe(dwell);
      }
    });

    it('generates the same session for the same seeded random, trace and span IDs included', () => {
      const first = simulate({
        platform: 'ios',
        seed: 'reproducible',
        health: MOBILE_HEALTH_PROFILES.critical,
      });
      const second = simulate({
        platform: 'ios',
        seed: 'reproducible',
        health: MOBILE_HEALTH_PROFILES.critical,
      });
      expect(second).toEqual(first);
    });

    it('produces more failures and crashes for unhealthy apps', () => {
      const count = (health: MobileHealthProfile) => {
        const docs = Array.from({ length: 40 }, (_, i) =>
          simulate({ platform: 'android', health, seed: `${health.name}:${i}`, screenViews: 5 })
        ).flat();
        return {
          failures: docs.filter(isSpan).filter(({ status }) => status.code === 'Error').length,
          crashes: logs(docs).filter(({ event_name: eventName }) => eventName === 'app.crash')
            .length,
        };
      };
      const healthy = count(MOBILE_HEALTH_PROFILES.healthy);
      const critical = count(MOBILE_HEALTH_PROFILES.critical);
      expect(critical.failures).toBeGreaterThan(healthy.failures);
      expect(critical.crashes).toBeGreaterThan(healthy.crashes);
    });
  });

  describe('proposed signals', () => {
    const NATIVE_MODEL: EdotReactNativeAppModel = {
      screens: [
        {
          name: 'Map',
          iosTitle: 'Map',
          requests: [
            { method: 'GET', url: 'https://api.example.com/v1/trails', backend: 'trails' },
          ],
          widgets: [{ id: 'locate', name: 'Locate' }],
        },
        {
          name: 'Detail',
          iosTitle: 'Detail',
          requests: [
            { method: 'GET', url: 'https://api.example.com/v1/trails/1', backend: 'trails' },
          ],
        },
      ],
    };
    const IOS_SESSION_ID = SESSION_ID.toUpperCase();
    const ANDROID_SESSION_ID = SESSION_ID.toLowerCase();

    const named = (docs: EdotReactNativeDocument[], eventName: string) =>
      logs(docs).filter(({ event_name: name }) => name === eventName);
    const spansNamed = (docs: EdotReactNativeDocument[], name: string) =>
      docs.filter(isSpan).filter((span) => span.name === name);
    const proposed = (options: Parameters<typeof simulate>[0]) =>
      simulate({ model: NATIVE_MODEL, native: true, proposedSignals: true, ...options });

    describe('client methods', () => {
      it('writes session events with the session id of the platform', () => {
        const [androidStart] = android({ sessionId: SESSION_ID })
          .sessionStart({ previousSessionId: SESSION_ID })
          .timestamp(TIMESTAMP)
          .serialize();
        expect(androidStart._index).toBe('logs-generic.otel-default');
        expect(androidStart.event_name).toBe(EVENT_SESSION_START);
        expect(androidStart.attributes).toMatchObject({
          'session.id': ANDROID_SESSION_ID,
          [ATTR_SESSION_PREVIOUS_ID]: ANDROID_SESSION_ID,
        });

        const [iosStart] = ios({ sessionId: ANDROID_SESSION_ID })
          .sessionStart({ previousSessionId: ANDROID_SESSION_ID })
          .serialize();
        expect(iosStart.attributes).toMatchObject({
          'session.id': IOS_SESSION_ID,
          [ATTR_SESSION_PREVIOUS_ID]: IOS_SESSION_ID,
        });

        const [first] = ios().sessionStart().serialize();
        expect(Object.keys(first.attributes ?? {})).not.toContain(ATTR_SESSION_PREVIOUS_ID);

        const [androidEnd] = android().sessionEnd().serialize();
        const [iosEnd] = ios({ sessionId: ANDROID_SESSION_ID }).sessionEnd().serialize();
        expect(androidEnd.event_name).toBe(EVENT_SESSION_END);
        expect(androidEnd.attributes?.['session.id']).toBe(ANDROID_SESSION_ID);
        expect(iosEnd.event_name).toBe(EVENT_SESSION_END);
        expect(iosEnd.attributes?.['session.id']).toBe(IOS_SESSION_ID);
      });

      it('writes the app start with its type and a float duration', () => {
        for (const client of [android(), ios()]) {
          const [cold] = client.appStart({ type: START_TYPE_COLD, durationMs: 1_200 }).serialize();
          const [warm] = client.appStart({ type: START_TYPE_WARM, durationMs: 310.46 }).serialize();
          expect(cold.event_name).toBe(EVENT_APP_START);
          expect(cold.attributes?.[ATTR_START_TYPE]).toBe(START_TYPE_COLD);
          expect(warm.attributes?.[ATTR_START_TYPE]).toBe(START_TYPE_WARM);
          [cold, warm].forEach(({ attributes }) => {
            expect(Number.isInteger(attributes?.[ATTR_APP_START_DURATION])).toBe(false);
          });
          expect(warm.attributes?.[ATTR_APP_START_DURATION]).toBe(310.5);
        }
      });

      it('writes screen and widget clicks as events with the session id of the platform', () => {
        const [androidClick] = android().screenClick().serialize();
        const [iosClick] = ios({ sessionId: ANDROID_SESSION_ID }).screenClick().serialize();
        const [widgetClick] = ios().widgetClick({ id: 'locate' }).serialize();
        expect(androidClick.event_name).toBe(EVENT_SCREEN_CLICK);
        expect(androidClick.attributes?.['session.id']).toBe(ANDROID_SESSION_ID);
        expect(iosClick.event_name).toBe(EVENT_SCREEN_CLICK);
        expect(iosClick.attributes?.['session.id']).toBe(IOS_SESSION_ID);
        expect(widgetClick.event_name).toBe(EVENT_WIDGET_CLICK);
      });

      it('writes an ANR on Android and a hang on iOS as ERROR logs', () => {
        const [anr] = android().freeze({ durationMs: 6_000 }).timestamp(TIMESTAMP).serialize();
        const [hang] = ios().freeze({ durationMs: 2_500 }).timestamp(TIMESTAMP).serialize();
        expect(anr._index).toBe('logs-generic.otel-default');
        expect(anr.severity_number).toBe(17);
        expect(anr.severity_text).toBe('ERROR');
        expect(anr.attributes).toMatchObject({
          [ATTR_ERROR_KIND]: ERROR_KIND_ANR,
          'session.id': ANDROID_SESSION_ID,
        });
        expect(hang.severity_number).toBe(17);
        expect(hang.attributes).toMatchObject({
          [ATTR_ERROR_KIND]: ERROR_KIND_HANG,
          'session.id': IOS_SESSION_ID,
        });
        [anr, hang].forEach(({ attributes }) => {
          expect(attributes?.['exception.type']).toEqual(expect.any(String));
          expect(attributes?.['exception.message']).toEqual(expect.any(String));
          expect(attributes?.['exception.stacktrace']).toEqual(expect.any(String));
        });
      });

      it('writes a handled error as a WARN exception event without a span', () => {
        const error = { type: 'java.io.IOException', message: 'boom', stacktrace: '...' };
        const [androidError] = android().handledError(error).timestamp(TIMESTAMP).serialize();
        const [iosError] = ios({ sessionId: ANDROID_SESSION_ID }).handledError(error).serialize();
        expect(androidError).toMatchObject({
          _index: 'logs-generic.otel-default',
          event_name: EVENT_EXCEPTION,
          severity_number: 13,
          severity_text: 'WARN',
          attributes: {
            'exception.type': 'java.io.IOException',
            'exception.message': 'boom',
            'exception.stacktrace': '...',
            'session.id': ANDROID_SESSION_ID,
          },
        });
        expect(androidError).not.toHaveProperty('span_id');
        expect(iosError.attributes?.['session.id']).toBe(IOS_SESSION_ID);
      });

      it('writes the screen load as an INTERNAL span with the screen name', () => {
        const [span] = ios()
          .screenLoad({ screenName: 'Map' })
          .timestamp(TIMESTAMP)
          .duration(120)
          .serialize();
        expect(span).toMatchObject({
          _index: 'traces-generic.otel-default',
          name: SPAN_SCREEN_LOAD,
          kind: 'Internal',
          attributes: { [ATTR_SCREEN_NAME]: 'Map', 'session.id': IOS_SESSION_ID },
        });
      });

      it('writes the backend as a SERVER span of its own service under the client span', () => {
        const ids = { traceId: 'a'.repeat(32), parentSpanId: 'b'.repeat(16) };
        const [span] = android()
          .backendSpan({
            service: 'trails',
            method: 'GET',
            url: 'https://api.example.com/v1/trails',
            statusCode: 503,
            ...ids,
          })
          .serialize();
        expect(span).toMatchObject({
          kind: 'Server',
          trace_id: ids.traceId,
          parent_span_id: ids.parentSpanId,
          status: { code: 'Error' },
          resource: {
            attributes: { 'service.name': 'trails', 'deployment.environment.name': 'production' },
          },
        });
        expect(Object.keys(span.attributes)).not.toContain('session.id');
      });

      it("writes no environment on backend spans when the app isn't configured with one", () => {
        const [span] = edotReactNative
          .app({ serviceName: 'internal-tools' })
          .client(DEVICE_PROFILES.iphone12Ios17, { installationId: INSTALLATION_ID })
          .backendSpan({
            service: 'trails',
            method: 'GET',
            url: 'https://api.example.com/v1/trails',
            statusCode: 200,
            traceId: 'a'.repeat(32),
            parentSpanId: 'b'.repeat(16),
          })
          .serialize();
        // EDOT iOS writes `default` for the app itself, which says nothing about the backend
        expect(span.resource.attributes).toEqual({ 'service.name': 'trails' });
      });
    });

    describe('session', () => {
      it('writes one session start and end around the session, with the previous session', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, visits: 2, previousSessionId: SESSION_ID });
          const [start, ...rest] = named(docs, EVENT_SESSION_START);
          const ends = named(docs, EVENT_SESSION_END);
          expect(rest).toHaveLength(0);
          expect(ends).toHaveLength(1);
          expect(start.attributes?.[ATTR_SESSION_PREVIOUS_ID]).toBe(
            platform === 'ios' ? IOS_SESSION_ID : ANDROID_SESSION_ID
          );
          const times = docs.map(timeOf);
          expect(timeOf(start)).toBe(Math.min(...times));
          expect(timeOf(ends[0])).toBe(Math.max(...times));
        }
      });

      it('writes an app start per launch, cold then warm', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, visits: 2, screenViews: 4 });
          const starts = named(docs, EVENT_APP_START).sort((a, b) => timeOf(a) - timeOf(b));
          expect(starts.map(({ attributes }) => attributes?.[ATTR_START_TYPE])).toEqual([
            START_TYPE_COLD,
            START_TYPE_WARM,
          ]);
          starts.forEach(({ attributes }) => {
            expect(Number.isInteger(attributes?.[ATTR_APP_START_DURATION])).toBe(false);
          });
        }
      });

      it('writes a screen load per screen view, parent of the requests of the screen', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, screenViews: 4 });
          const loads = spansNamed(docs, SPAN_SCREEN_LOAD);
          expect(loads).toHaveLength(4);
          const requests = docs
            .filter(isSpan)
            .filter(({ kind, name }) => kind === 'Client' && name.startsWith('GET'));
          expect(requests.length).toBeGreaterThan(0);
          requests.forEach((request) => {
            const parent = loads.find(({ span_id: spanId }) => spanId === request.parent_span_id);
            expect(parent?.trace_id).toBe(request.trace_id);
            expect(request.attributes[ATTR_SCREEN_NAME]).toBe(parent?.attributes[ATTR_SCREEN_NAME]);
          });
          loads.forEach(({ attributes }) => {
            expect(attributes[ATTR_SCREEN_NAME]).toEqual(expect.any(String));
          });
        }
      });

      it('writes backend SERVER spans under the client span, shorter than it, unless it failed', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, screenViews: 4 });
          const servers = docs.filter(isSpan).filter(({ kind }) => kind === 'Server');
          const clients = docs.filter(isSpan).filter(({ kind }) => kind === 'Client');
          expect(servers.length).toBeGreaterThan(0);
          servers.forEach((server) => {
            const client = clients.find(({ span_id: spanId }) => spanId === server.parent_span_id);
            expect(client?.trace_id).toBe(server.trace_id);
            expect(Number(server.duration)).toBeLessThan(Number(client?.duration));
            expect(server.resource.attributes['service.name']).toBe('trails');
          });

          const offline = proposed({
            platform,
            screenViews: 4,
            health: withHealth({ networkErrorRate: 1 }),
          });
          expect(offline.filter(isSpan).filter(({ kind }) => kind === 'Server')).toHaveLength(0);
          offline
            .filter(isSpan)
            .filter(({ kind, name }) => kind === 'Client' && name.startsWith('GET'))
            .forEach(({ attributes }) => {
              expect(attributes['error.type']).toEqual(expect.any(String));
            });
        }
      });

      it('stamps the screen name on the logs written while a screen is shown', () => {
        const docs = proposed({
          platform: 'android',
          screenViews: 4,
          health: withHealth({ errorLogRate: 1 }),
        });
        const errorLogs = logs(docs).filter(({ severity_number: severity }) => severity === 17);
        expect(errorLogs.length).toBeGreaterThan(0);
        errorLogs.forEach(({ attributes }) => {
          expect(attributes?.[ATTR_SCREEN_NAME]).toEqual(expect.any(String));
        });
      });

      it('writes screen and widget clicks', () => {
        const docs = Array.from({ length: 20 }, (_, i) =>
          proposed({ platform: 'ios', seed: `taps:${i}`, screenViews: 5 })
        ).flat();
        expect(named(docs, EVENT_SCREEN_CLICK).length).toBeGreaterThan(0);
        expect(named(docs, EVENT_WIDGET_CLICK).length).toBeGreaterThan(0);
      });

      it('writes an ANR per screen view on Android and a hang on iOS at the right rates', () => {
        const kindOf = (platform: 'android' | 'ios') =>
          logs(
            proposed({
              platform,
              screenViews: 4,
              health: withHealth({ anrRate: 1, hangRate: 1 }),
            })
          )
            .map(({ attributes }) => attributes?.[ATTR_ERROR_KIND])
            .filter((kind) => kind !== undefined);
        expect(kindOf('android')).toEqual(Array(4).fill(ERROR_KIND_ANR));
        expect(kindOf('ios')).toEqual(Array(4).fill(ERROR_KIND_HANG));
        const none = proposed({
          platform: 'android',
          screenViews: 4,
          health: withHealth({ anrRate: 0, hangRate: 0 }),
        });
        const freezes = logs(none).filter(
          ({ attributes }) => ATTR_ERROR_KIND in (attributes ?? {})
        );
        expect(freezes).toEqual([]);
      });

      it('writes handled errors on the screen they happen on, and only when asked to', () => {
        const health = withHealth({ handledErrorRate: 1 });
        for (const platform of ['android', 'ios'] as const) {
          const handled = logs(proposed({ platform, screenViews: 4, health })).filter(
            ({ event_name: name, span_id: spanId }) =>
              name === EVENT_EXCEPTION && spanId === undefined
          );
          expect(handled).toHaveLength(4);
          handled.forEach(({ severity_text: severity, attributes }) => {
            expect(severity).toBe('WARN');
            expect(attributes?.[ATTR_SCREEN_NAME]).toEqual(expect.any(String));
            expect(attributes?.['exception.stacktrace']).toEqual(expect.any(String));
          });
        }
        const without = simulate({
          platform: 'android',
          model: NATIVE_MODEL,
          native: true,
          health,
        });
        expect(logs(without).filter(({ severity_text: severity }) => severity === 'WARN')).toEqual(
          []
        );
      });

      it('reports a crash on the next launch with the id of the crashed session', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, screenViews: 3, health: withHealth({ crashRate: 1 }) });
          const crashes = named(docs, 'app.crash');
          expect(crashes).toHaveLength(1);
          const [crash] = crashes;
          expect(crash.attributes?.['session.id']).toBe(
            platform === 'ios' ? IOS_SESSION_ID : ANDROID_SESSION_ID
          );
          const starts = named(docs, EVENT_APP_START).sort((a, b) => timeOf(a) - timeOf(b));
          const relaunch = starts[starts.length - 1];
          expect(timeOf(crash)).toBeLessThan(timeOf(relaunch));
          // Backdated to the crash, and observed when the relaunch reports it
          expect(Number(crash.observed_timestamp)).toBeGreaterThan(timeOf(crash));
          expect(Number(crash.observed_timestamp)).toBeLessThanOrEqual(timeOf(relaunch));
          expect(relaunch.attributes?.[ATTR_START_TYPE]).toBe(START_TYPE_COLD);
          expect(timeOf(named(docs, EVENT_SESSION_END)[0])).toBeGreaterThan(timeOf(relaunch));
        }
      });

      it('keeps a request exported before a crash even when its screen load was lost', () => {
        // On a screen slow to appear, requests end before it has, and so can be exported before
        // the screen load span, which a crash right after then loses, as with the SDKs
        const orphans = Array.from({ length: 100 }, (_, i) =>
          proposed({
            platform: 'ios',
            seed: `orphan:${i}`,
            screenViews: 1,
            health: withHealth({ crashRate: 1, viewAppear: { median: 3_000, sigma: 0.3 } }),
          })
        ).flatMap((docs) => {
          const spanIds = new Set(docs.filter(isSpan).map(({ span_id: spanId }) => spanId));
          return docs
            .filter(isSpan)
            .filter(
              ({ kind, parent_span_id: parentSpanId }) =>
                kind === 'Client' && parentSpanId !== undefined && !spanIds.has(parentSpanId)
            );
        });
        expect(orphans.length).toBeGreaterThan(0);
      });

      it('gives native apps native crashes only', () => {
        const docs = Array.from({ length: 20 }, (_, i) =>
          proposed({
            platform: 'android',
            seed: `native:${i}`,
            screenViews: 2,
            health: withHealth({ crashRate: 1 }),
          })
        ).flat();
        const types = named(docs, 'app.crash').map(
          ({ attributes }) => attributes?.['exception.type']
        );
        expect(types.length).toBeGreaterThan(0);
        expect(types).not.toContain('com.facebook.react.common.JavascriptException');
      });

      it("leaves JavaScript crashes out of a native app's own crashes too", () => {
        const model: EdotReactNativeAppModel = {
          ...NATIVE_MODEL,
          crashes: {
            android: [
              {
                type: 'com.facebook.react.common.JavascriptException',
                message: 'TypeError: undefined is not a function',
              },
            ],
          },
        };
        const types = Array.from({ length: 20 }, (_, i) =>
          proposed({
            platform: 'android',
            model,
            seed: `native-own:${i}`,
            screenViews: 2,
            health: withHealth({ crashRate: 1 }),
          })
        )
          .flatMap((docs) => named(docs, 'app.crash'))
          .map(({ attributes }) => attributes?.['exception.type']);
        expect(types.length).toBeGreaterThan(0);
        expect(types).not.toContain('com.facebook.react.common.JavascriptException');
      });

      it('writes no freezes or handled errors for a health profile without their rates', () => {
        const { anrRate, hangRate, handledErrorRate, ...withoutRates } =
          MOBILE_HEALTH_PROFILES.critical;
        for (const platform of ['android', 'ios'] as const) {
          const docs = proposed({ platform, screenViews: 6, health: withoutRates });
          expect(logs(docs).filter(({ attributes }) => attributes?.[ATTR_ERROR_KIND])).toEqual([]);
          expect(logs(docs).filter(({ severity_text: severity }) => severity === 'WARN')).toEqual(
            []
          );
        }
      });

      it('gives native apps native scopes and no React Native root view', () => {
        for (const platform of ['android', 'ios'] as const) {
          const docs = Array.from({ length: 10 }, (_, i) =>
            proposed({
              platform,
              seed: `scopes:${i}`,
              screenViews: 4,
              health: withHealth({ errorLogRate: 1 }),
            })
          ).flat();
          const scopes = new Set(docs.map(({ scope }) => scope?.name));
          expect(scopes).toContain('co.elastic.otel.mobile.interactions');
          expect(scopes).toContain('com.example.trailmap');
          scopes.forEach((name) => expect(name).not.toContain('react-native'));
          expect(spansNamed(docs, 'UIViewController - view appearing')).toEqual([]);
        }
      });

      it('writes none of the proposed signals unless asked to', () => {
        const names = [
          EVENT_SESSION_START,
          EVENT_SESSION_END,
          EVENT_APP_START,
          EVENT_SCREEN_CLICK,
          SPAN_SCREEN_LOAD,
          ATTR_SESSION_PREVIOUS_ID,
          ATTR_START_TYPE,
          ATTR_APP_START_DURATION,
          ATTR_SCREEN_NAME,
          ATTR_ERROR_KIND,
        ];
        for (const platform of ['android', 'ios'] as const) {
          const json = JSON.stringify(
            simulate({
              platform,
              model: NATIVE_MODEL,
              native: true,
              proposedSignals: false,
              previousSessionId: SESSION_ID,
              health: MOBILE_HEALTH_PROFILES.critical,
              screenViews: 6,
              visits: 2,
            })
          );
          names.forEach((name) => expect(json).not.toContain(name));
          expect(json).not.toContain('"Server"');
        }
      });
    });
  });
});
