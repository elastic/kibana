/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EVENT_APP_START,
  EVENT_SESSION_START,
  SPAN_SCREEN_LOAD,
  edotReactNative,
  timerange,
  type DeviceProfileId,
  type EdotReactNativeDocument,
  type EdotReactNativeSpanDocument,
  type OtelLogDocument,
  type Timerange,
} from '@kbn/synthtrace-client';
import { getDefaultSeed, sessionTimeOf } from './digital_experience_apps';
import {
  DIGITAL_EXPERIENCE_MOBILE_APPS,
  DIGITAL_EXPERIENCE_NATIVE_APPS,
  MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION,
  generateEdotNativeSessions,
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
  parseDigitalExperienceNativeScenarioOpts,
  type DigitalExperienceMobileApp,
  type DigitalExperienceMobileScenarioOpts,
} from './digital_experience_mobile_apps';

const range = timerange(new Date('2026-10-16T12:00:00.000Z'), new Date('2026-10-16T12:30:00.000Z'));

const FROM = range.from.getTime();

const collect = (
  opts: Partial<
    DigitalExperienceMobileScenarioOpts & {
      from: number;
      apps: readonly DigitalExperienceMobileApp[];
    }
  > = {},
  timeRange: Timerange = range
): EdotReactNativeDocument[] =>
  generateEdotReactNativeSessions(timeRange, {
    environment: 'test',
    from: timeRange.from.getTime(),
    scale: 1,
    platform: 'both',
    withManualSpans: true,
    // Pin the seed so the minimums the tests rely on don't depend on the range's start
    seed: 'digital-experience-mobile-test',
    ...opts,
  }).flatMap((generator) =>
    Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
  );

const isSpan = (doc: EdotReactNativeDocument): doc is EdotReactNativeSpanDocument =>
  'span_id' in doc && 'kind' in doc;

const logsOf = (docs: EdotReactNativeDocument[]): OtelLogDocument[] =>
  docs.filter((doc): doc is OtelLogDocument => !isSpan(doc));

const serviceOf = (doc: EdotReactNativeDocument) =>
  (isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes)?.['service.name'];

const PLATFORM_BY_OS_NAME: Readonly<Record<string, string>> = {
  Android: 'android',
  iOS: 'ios',
  iPadOS: 'ios',
};

const platformOf = (doc: EdotReactNativeDocument) =>
  PLATFORM_BY_OS_NAME[
    String((isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes)?.['os.name'])
  ];

describe('digital experience mobile apps', () => {
  // A 30-minute run is enough for every app to show every signal, and shared by the tests
  let docs: EdotReactNativeDocument[];
  beforeAll(() => {
    docs = collect();
  });

  describe('parseDigitalExperienceMobileScenarioOpts', () => {
    it('defaults to both platforms, manual spans and scale 1', () => {
      expect(parseDigitalExperienceMobileScenarioOpts(undefined, FROM)).toEqual({
        scale: 1,
        seed: getDefaultSeed(FROM),
        platform: 'both',
        withManualSpans: true,
      });
    });

    it('parses string options from the CLI', () => {
      expect(
        parseDigitalExperienceMobileScenarioOpts(
          {
            platform: 'iOS',
            withManualSpans: 'false',
            scale: '0.5',
            seed: 42,
          },
          FROM
        )
      ).toEqual({ platform: 'ios', withManualSpans: false, scale: 0.5, seed: '42' });
    });

    it('rejects unknown keys and invalid values', () => {
      expect(() => parseDigitalExperienceMobileScenarioOpts({ withSessionId: true }, FROM)).toThrow(
        'Unknown scenarioOpts: withSessionId'
      );
      expect(() => parseDigitalExperienceMobileScenarioOpts({ platform: 'web' }, FROM)).toThrow(
        'platform must be android, ios or both'
      );
      expect(() =>
        parseDigitalExperienceMobileScenarioOpts({ withManualSpans: 'yes' }, FROM)
      ).toThrow('withManualSpans must be true or false');
    });
  });

  describe('generateEdotReactNativeSessions', () => {
    it('writes every signal for the apps over half an hour', () => {
      const eventNames = new Set(logsOf(docs).map(({ event_name: eventName }) => eventName));
      expect([...eventNames].sort()).toEqual(
        expect.arrayContaining([
          'app.crash',
          'app.widget.click',
          'device.app.lifecycle',
          'exception',
        ])
      );
      expect(logsOf(docs).some(({ severity_text: severity }) => severity === 'ERROR')).toBe(true);

      const spanNames = new Set(docs.filter(isSpan).map(({ name }) => name));
      expect(spanNames).toContain('app.launch');
      expect(spanNames).toContain('Weather - view appearing');
      expect(spanNames).toContain('GET weather-api.example.com');

      const services = new Set(docs.map(serviceOf));
      expect([...services].sort()).toEqual(
        DIGITAL_EXPERIENCE_MOBILE_APPS.map(({ serviceName }) => serviceName).sort()
      );
    });

    it('writes data of both platforms, and never as EDOT Browser', () => {
      const platforms = new Set(docs.map(platformOf));
      expect([...platforms].sort()).toEqual(['android', 'ios']);
      docs.forEach((doc) => {
        const resource = isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes;
        expect(resource?.['telemetry.sdk.name']).toBe('opentelemetry');
        expect(resource?.['telemetry.distro.name']).toBe('elastic');
        expect(resource?.['telemetry.sdk.language']).not.toBe('webjs');
      });
    });

    it('logs an error for every failed New York forecast of the weather demo', () => {
      const newYork = docs
        .filter(isSpan)
        .filter(({ attributes }) => String(attributes['url.full']).includes('city=New%20York'));
      expect(newYork.length).toBeGreaterThan(0);
      newYork.forEach(({ status }) => expect(status.code).toBe('Error'));
      const errorLogs = logsOf(docs).filter(
        ({ body, severity_text: severity }) =>
          severity === 'ERROR' && body?.text?.startsWith('Error while fetching forecast')
      );
      expect(errorLogs.length).toBeGreaterThanOrEqual(newYork.length);
    });

    it('skews the audience of apps that override device weights', () => {
      const androidShare = (serviceName: string) => {
        // Span events have no session.id, but every session has other documents
        const platformBySession = new Map(
          docs
            .filter((doc) => serviceOf(doc) === serviceName && doc.attributes?.['session.id'])
            .map((doc) => [doc.attributes?.['session.id'], platformOf(doc)])
        );
        const platforms = [...platformBySession.values()];
        return platforms.filter((platform) => platform === 'android').length / platforms.length;
      };
      // banking-mobile is mostly iOS, shop-mobile mostly Android
      expect(androidShare('banking-mobile')).toBeLessThan(0.3);
      expect(androidShare('shop-mobile')).toBeGreaterThan(0.5);
    });

    it('generates only one platform when asked to', () => {
      const iosDocs = collect({ platform: 'ios' });
      expect(new Set(iosDocs.map(platformOf))).toEqual(new Set(['ios']));
      // field-service-mobile is Android only
      expect(iosDocs.some((doc) => serviceOf(doc) === 'field-service-mobile')).toBe(false);
    });

    it('only drops the spans the apps create themselves without manual spans', () => {
      const sdkOnly = collect({ withManualSpans: false });
      expect(sdkOnly.filter(isSpan).some(({ kind }) => kind === 'Internal')).toBe(false);
      // Everything the SDKs record stays the same for the same seed
      const withoutManualSpans = docs.filter((doc) => !isSpan(doc) || doc.kind !== 'Internal');
      expect(sdkOnly).toEqual(withoutManualSpans);
    });

    describe('installations and versions', () => {
      // Each installation opens the app every 90 minutes, so they come back over a longer range
      const longRange = timerange(range.from, new Date(range.from.getTime() + 6 * 60 * 60_000));
      let longDocs: EdotReactNativeDocument[];
      beforeAll(() => {
        longDocs = collect({ scale: 0.2 }, longRange);
      });

      const resourceOf = (doc: EdotReactNativeDocument) =>
        (isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes) ?? {};

      const sessionsByInstallation = (serviceName: string, runDocs = longDocs) => {
        const sessions = new Map<string, Map<string, { start: number; end: number }>>();
        runDocs
          .filter((doc) => serviceOf(doc) === serviceName && doc.attributes?.['session.id'])
          .forEach((doc) => {
            const installationId = String(resourceOf(doc)['app.installation.id']);
            const sessionId = String(doc.attributes?.['session.id']);
            const time = Number(doc['@timestamp']);
            const end = time + (isSpan(doc) ? (doc.duration ?? 0) / 1_000_000 : 0);
            const byId = sessions.get(installationId) ?? new Map();
            const session = byId.get(sessionId) ?? { start: time, end };
            byId.set(sessionId, {
              start: Math.min(session.start, time),
              end: Math.max(session.end, end),
            });
            sessions.set(installationId, byId);
          });
        return sessions;
      };

      it('brings installations back for more sessions, at least 30 minutes after the last', () => {
        DIGITAL_EXPERIENCE_MOBILE_APPS.forEach(({ serviceName }) => {
          const sessions = sessionsByInstallation(serviceName);
          const sessionCount = [...sessions.values()].reduce((sum, { size }) => sum + size, 0);
          expect(sessions.size).toBeLessThan(sessionCount / 2);
          sessions.forEach((byId) => {
            const sorted = [...byId.values()].sort((a, b) => a.start - b.start);
            sorted.slice(1).forEach(({ start }, i) => {
              expect(start - sorted[i].end).toBeGreaterThan(30 * 60_000);
            });
          });
        });
      });

      it('brings installations back across the workers of a run without a seed', () => {
        // Synthtrace evaluates the scenario again in each worker, one per hour of a long run
        const from = longRange.from.getTime();
        // Like the scenario, without a seed option the parser defaults it to the run's start
        const opts = { ...parseDigitalExperienceMobileScenarioOpts({ scale: 0.2 }, from), from };
        const hours = [0, 1, 2, 3].map((hour) => new Date(from + hour * 60 * 60_000));
        const workerDocs = hours
          .slice(1)
          .flatMap((end, i) => collect(opts, timerange(hours[i], end)));
        const unsplit = collect(opts, timerange(hours[0], hours[3]));
        const sortKey = (doc: EdotReactNativeDocument) => JSON.stringify(doc);
        expect(workerDocs.map(sortKey).sort()).toEqual(unsplit.map(sortKey).sort());
        DIGITAL_EXPERIENCE_MOBILE_APPS.forEach(({ serviceName }) => {
          const sessions = sessionsByInstallation(serviceName, workerDocs);
          const sessionCount = [...sessions.values()].reduce((sum, { size }) => sum + size, 0);
          expect(sessions.size).toBeLessThan(sessionCount * 0.75);
        });
      });

      it('keeps the device and the app version of an installation', () => {
        const byInstallation = new Map<string, Set<string>>();
        longDocs.forEach((doc) => {
          const resource = resourceOf(doc);
          const key = String(resource['app.installation.id']);
          const values = byInstallation.get(key) ?? new Set();
          values.add(
            [
              resource['device.id'],
              resource['device.model.identifier'],
              resource['service.version'],
            ]
              .map(String)
              .join('|')
          );
          byInstallation.set(key, values);
        });
        byInstallation.forEach((values) => expect(values.size).toBe(1));
      });

      it('spreads the installations over the app versions, newest first', () => {
        DIGITAL_EXPERIENCE_MOBILE_APPS.forEach(({ serviceName, versions }) => {
          const versionByInstallation = new Map(
            longDocs
              .filter((doc) => serviceOf(doc) === serviceName)
              .map((doc) => [
                resourceOf(doc)['app.installation.id'],
                resourceOf(doc)['service.version'],
              ])
          );
          const counts = versions.map(
            ({ serviceVersion }) =>
              [...versionByInstallation.values()].filter((version) => version === serviceVersion)
                .length
          );
          expect(counts[0]).toBeGreaterThan(counts[1]);
          expect(counts[1]).toBeGreaterThan(0);
          expect(counts.reduce((sum, count) => sum + count, 0)).toBe(versionByInstallation.size);
        });
      });

      it('only crashes the newest banking-mobile version with its regression', () => {
        const regression = logsOf(collect({ scale: 3 }, longRange)).filter(
          (doc) =>
            serviceOf(doc) === 'banking-mobile' &&
            String(doc.attributes?.['exception.message']).includes('payee.iban')
        );
        expect(regression.length).toBeGreaterThan(0);
        regression.forEach((doc) => expect(resourceOf(doc)['service.version']).toBe('3.8.0'));
      });
    });

    it('generates only the given apps, over their fixed number of installations', () => {
      const weatherDemo = DIGITAL_EXPERIENCE_MOBILE_APPS.find(
        ({ serviceName }) => serviceName === 'weather-demo-react-native'
      );
      if (!weatherDemo) {
        throw new Error('weather-demo-react-native is missing');
      }
      const appDocs = collect({ apps: [{ ...weatherDemo, installations: 1 }] });
      expect(new Set(appDocs.map(serviceOf))).toEqual(new Set([weatherDemo.serviceName]));
      const installationIds = new Set(
        appDocs
          .map((doc) => (isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes))
          .flatMap((attributes) => attributes?.['app.installation.id'] ?? [])
      );
      expect(installationIds.size).toBe(1);
    });

    it("takes the cellular rate of the installation's version", () => {
      const weatherDemo = DIGITAL_EXPERIENCE_MOBILE_APPS.find(
        ({ serviceName }) => serviceName === 'weather-demo-react-native'
      );
      if (!weatherDemo) {
        throw new Error('weather-demo-react-native is missing');
      }
      const allCellular = {
        ...weatherDemo,
        versions: weatherDemo.versions.map((version) => ({
          ...version,
          health: { ...version.health, cellularRate: 1 },
        })),
      };
      // Every log has the network type, except the `exception` span events
      const networkTypes = new Set(
        logsOf(collect({ apps: [allCellular] }))
          .filter(({ event_name: eventName }) => eventName !== 'exception')
          .map(({ attributes }) => attributes?.['network.connection.type'])
      );
      expect(networkTypes).toEqual(new Set(['cell']));
    });

    it('keeps everything within the range', () => {
      const from = range.from.getTime();
      const to = range.to.getTime();
      docs.forEach((doc) => {
        expect(doc['@timestamp']).toBeGreaterThanOrEqual(from);
        expect(doc['@timestamp']).toBeLessThan(to);
      });
    });

    it('generates the same data for the same seed, however the range is split', () => {
      const shortRange = timerange(range.from, new Date(range.from.getTime() + 5 * 60_000));
      const whole = collect({}, shortRange);
      const first = timerange(shortRange.from, new Date(shortRange.from.getTime() + 2 * 60_000));
      const second = timerange(first.to, shortRange.to);
      const split = [
        ...collect({}, first),
        // A later batch doesn't cut sessions off at its own start
        ...generateEdotReactNativeSessions(second, {
          environment: 'test',
          from: shortRange.from.getTime(),
          scale: 1,
          platform: 'both',
          withManualSpans: true,
          seed: 'digital-experience-mobile-test',
        }).flatMap((generator) =>
          Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
        ),
      ];
      const sortKey = (doc: EdotReactNativeDocument) => JSON.stringify(doc);
      expect(split.map(sortKey).sort()).toEqual(whole.map(sortKey).sort());
    });
  });

  describe('native apps', () => {
    const collectNative = (timeRange: Timerange = range, scale = 1, from?: number) =>
      generateEdotNativeSessions(timeRange, {
        environment: 'test',
        from: from ?? timeRange.from.getTime(),
        scale,
        platform: 'both',
        seed: 'digital-experience-native-test',
      }).flatMap((generator) =>
        Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
      );

    it('has an Android app, an iOS app and an app on both platforms, with three versions each', () => {
      const platformsOf = ({ deviceWeights = {} }: DigitalExperienceMobileApp) => {
        const left = Object.entries(deviceWeights)
          .filter(([, weight]) => weight === 0)
          .map(([id]) => edotReactNative.deviceProfiles[id as DeviceProfileId].platform);
        return { android: !left.includes('android'), ios: !left.includes('ios') };
      };
      const platforms = DIGITAL_EXPERIENCE_NATIVE_APPS.map(platformsOf);
      expect(platforms).toContainEqual({ android: true, ios: false });
      expect(platforms).toContainEqual({ android: false, ios: true });
      expect(platforms).toContainEqual({ android: true, ios: true });

      DIGITAL_EXPERIENCE_NATIVE_APPS.forEach(({ versions, native }) => {
        expect(native).toBe(true);
        expect(versions.length).toBeGreaterThanOrEqual(3);
        const [newest, previous] = versions;
        expect(Number(newest.health?.crashRate)).toBeGreaterThan(
          Number(previous.health?.crashRate)
        );
        expect(Number(newest.health?.coldLaunch?.median)).toBeGreaterThan(
          Number(previous.health?.coldLaunch?.median)
        );
      });
    });

    it('names a backend for the requests of every app', () => {
      DIGITAL_EXPERIENCE_NATIVE_APPS.forEach(({ model }) => {
        const requests = model.screens.flatMap(
          ({ requests: screenRequests = [], widgets = [] }) => [
            ...screenRequests,
            ...widgets.flatMap(({ request }) => (request ? [request] : [])),
          ]
        );
        expect(requests.length).toBeGreaterThan(0);
        requests.forEach(({ backend }) => expect(backend).toEqual(expect.any(String)));
      });
    });

    it('only writes the proposed signals for the native apps', () => {
      const nativeDocs = collectNative();
      const eventNames = new Set(logsOf(nativeDocs).map(({ event_name: eventName }) => eventName));
      expect(eventNames).toContain(EVENT_SESSION_START);
      expect(eventNames).toContain(EVENT_APP_START);

      const json = JSON.stringify(docs);
      expect(json).not.toContain(EVENT_SESSION_START);
      expect(json).not.toContain(SPAN_SCREEN_LOAD);
    });

    it('writes every session that starts in the run, from its start, the long ones included', () => {
      const nativeDocs = collectNative();
      const starts = logsOf(nativeDocs).filter(
        ({ event_name: eventName }) => eventName === EVENT_SESSION_START
      );
      const minutes = (range.to.getTime() - FROM) / 60_000;
      DIGITAL_EXPERIENCE_NATIVE_APPS.forEach(({ serviceName, sessionsPerMinute }) => {
        const ofApp = starts.filter((doc) => serviceOf(doc) === serviceName);
        expect(ofApp).toHaveLength(sessionsPerMinute * minutes);
      });
      nativeDocs.forEach((doc) => {
        expect(Number(doc['@timestamp'])).toBeGreaterThanOrEqual(FROM);
        expect(Number(doc['@timestamp'])).toBeLessThan(range.to.getTime());
      });
    });

    it('writes every document in live mode once the SDK sends it, crashes on the next launch', () => {
      const start = range.from.getTime();
      const end = start + 20 * 60_000;
      const batchMs = 60_000;
      const sentAt = (doc: EdotReactNativeDocument) =>
        isSpan(doc)
          ? Number(doc['@timestamp']) + (doc.duration ?? 0) / 1_000_000
          : Math.max(Number(doc['@timestamp']), Number(doc.observed_timestamp ?? 0));
      const batches = Array.from({ length: (end - start) / batchMs }, (_, i) => {
        const batch = timerange(new Date(start + i * batchMs), new Date(start + (i + 1) * batchMs));
        return { from: start + i * batchMs, docs: collectNative(batch, 1, start) };
      });

      const crashes = batches.flatMap(({ docs: batchDocs }) =>
        logsOf(batchDocs).filter(({ event_name: eventName }) => eventName === 'app.crash')
      );
      expect(crashes.length).toBeGreaterThan(0);
      batches.forEach(({ from, docs: batchDocs }) =>
        batchDocs.forEach((doc) => {
          expect(sentAt(doc)).toBeGreaterThanOrEqual(from);
          expect(sentAt(doc)).toBeLessThan(from + batchMs);
        })
      );
    });

    it('keeps the end of every native session that has time to end within the run', () => {
      // Native sessions last less than 2 hours, so the ones of the first 15 minutes of a
      // 2-hour run end in it
      const twoHours = timerange(range.from, new Date(FROM + 2 * 60 * 60_000));
      const nativeLogs = logsOf(collectNative(twoHours, 0.5));
      const sessionsWith = (name: string) =>
        nativeLogs
          .filter(({ event_name: eventName }) => eventName === name)
          .map(({ attributes, '@timestamp': time }) => ({
            sessionId: attributes?.['session.id'],
            time: Number(time),
          }));
      const ended = new Set(sessionsWith('session.end').map(({ sessionId }) => sessionId));
      const early = sessionsWith(EVENT_SESSION_START).filter(
        ({ time }) => time < FROM + 15 * 60_000
      );

      expect(early.length).toBeGreaterThan(0);
      early.forEach(({ sessionId }) => expect(ended).toContain(sessionId));
    });

    it('generates the apps it is given as native apps', () => {
      const [reactNativeApp] = DIGITAL_EXPERIENCE_MOBILE_APPS;
      expect(reactNativeApp.native).toBeUndefined();
      const appDocs = generateEdotNativeSessions(range, {
        environment: 'test',
        from: FROM,
        scale: 1,
        platform: 'both',
        seed: 'digital-experience-native-test',
        apps: [reactNativeApp],
      }).flatMap((generator) =>
        Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
      );

      expect(appDocs.length).toBeGreaterThan(0);
      appDocs.forEach(({ scope }) => expect(scope?.name ?? '').not.toContain('react-native'));
      expect(
        appDocs.filter((doc) => isSpan(doc) && doc.name.startsWith('UIViewController'))
      ).toEqual([]);
    });

    it('rolls the newest version of every app out over the run, without downgrades', () => {
      const hours = 6;
      // One full cycle of the installations after the rollout's deadline, so every one opens the app
      const cycleHours = MINUTES_BETWEEN_SESSIONS_OF_AN_INSTALLATION / 60;
      const run = timerange(range.from, new Date(FROM + (hours + cycleHours) * 60 * 60_000));
      const starts = logsOf(collectNative(run, 0.25)).filter(
        ({ event_name: eventName }) => eventName === EVENT_SESSION_START
      );
      DIGITAL_EXPERIENCE_NATIVE_APPS.forEach(({ serviceName, versions }) => {
        const [newest] = versions;
        const ofApp = starts.filter((doc) => serviceOf(doc) === serviceName);
        const newestShare = (fromHour: number, toHour: number) => {
          const inWindow = ofApp.filter((doc) => {
            const hour = (Number(doc['@timestamp']) - FROM) / (60 * 60_000);
            return hour >= fromHour && hour < toHour;
          });
          const onNewest = inWindow.filter(
            ({ resource }) => resource?.attributes?.['service.version'] === newest.serviceVersion
          );
          return onNewest.length / inWindow.length;
        };
        // Every installation takes part in the rollout, from its initial adoption to all of them
        const initialAdoption = newest.rollout?.initialAdoption ?? 0;
        expect(newestShare(0, 0.5)).toBeGreaterThan(initialAdoption - 0.15);
        expect(newestShare(0, 0.5)).toBeLessThan(initialAdoption + 0.2);
        expect(newestShare(5.5, hours)).toBeGreaterThan(0.85);
        expect(newestShare(hours, hours + cycleHours)).toBe(1);

        // An installation never goes back to an older version
        const versionsByInstallation = new Map<unknown, string[]>();
        [...ofApp]
          .sort((a, b) => Number(a['@timestamp']) - Number(b['@timestamp']))
          .forEach(({ resource }) => {
            const installationId = resource?.attributes?.['app.installation.id'];
            const seen = versionsByInstallation.get(installationId) ?? [];
            versionsByInstallation.set(installationId, [
              ...seen,
              String(resource?.attributes?.['service.version']),
            ]);
          });
        const order = versions.map(({ serviceVersion }) => serviceVersion);
        versionsByInstallation.forEach((installed) => {
          const indexes = installed.map((version) => order.indexOf(version));
          indexes.slice(1).forEach((index, i) => expect(index).toBeLessThanOrEqual(indexes[i]));
        });
      });
    });

    it("points session.previous_id to the installation's previous session in the run", () => {
      // Longer than an installation cycle, so that the installations come back
      const run = timerange(range.from, new Date(FROM + 2 * 60 * 60_000));
      const starts = logsOf(collectNative(run, 0.25))
        .filter(({ event_name: eventName }) => eventName === EVENT_SESSION_START)
        .sort((a, b) => Number(a['@timestamp']) - Number(b['@timestamp']));
      const startsByInstallation = new Map<unknown, OtelLogDocument[]>();
      starts.forEach((start) => {
        const installationId = start.resource?.attributes?.['app.installation.id'];
        startsByInstallation.set(installationId, [
          ...(startsByInstallation.get(installationId) ?? []),
          start,
        ]);
      });

      const returning = [...startsByInstallation.values()].filter(({ length }) => length > 1);
      expect(returning.length).toBeGreaterThan(0);
      startsByInstallation.forEach(([first, ...later]) => {
        // The run doesn't have the session before an installation's first one
        expect(first.attributes).not.toHaveProperty('session.previous_id');
        later.forEach((start, i) => {
          const previousSessionId = (i === 0 ? first : later[i - 1]).attributes?.['session.id'];
          expect(previousSessionId).toEqual(expect.stringMatching(/.+/));
          expect(start.attributes?.['session.previous_id']).toBe(previousSessionId);
        });
      });
    });

    it('runs the newest version everywhere for a rollout without hours', () => {
      const [app] = DIGITAL_EXPERIENCE_NATIVE_APPS;
      const [newest, ...older] = app.versions;
      const immediate = {
        ...app,
        versions: [{ ...newest, rollout: { initialAdoption: 0, hours: 0 } }, ...older],
      };
      // The run starts on the tick of a session, which therefore starts with the rollout
      const perMinute = app.sessionsPerMinute;
      const from = sessionTimeOf(Math.ceil((perMinute * FROM) / 60_000), perMinute);
      const immediateLogs = logsOf(
        generateEdotNativeSessions(timerange(new Date(from), range.to), {
          environment: 'test',
          from,
          scale: 1,
          platform: 'both',
          seed: 'digital-experience-native-test',
          apps: [immediate],
        }).flatMap((generator) =>
          Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
        )
      );

      const timesOfStarts = immediateLogs
        .filter(({ event_name: eventName }) => eventName === EVENT_SESSION_START)
        .map((doc) => Number(doc['@timestamp']));
      expect(timesOfStarts).toContain(from);
      expect(
        new Set(immediateLogs.map(({ resource }) => resource?.attributes?.['service.version']))
      ).toEqual(new Set([newest.serviceVersion]));
    });

    it('keeps the sessions in progress of apps that share a service name apart', () => {
      const [app] = DIGITAL_EXPERIENCE_NATIVE_APPS;
      const withVersion = (serviceVersion: string, appId: string) => ({
        ...app,
        appId,
        versions: [{ ...app.versions[0], serviceVersion, rollout: undefined }],
      });
      const first = withVersion('9.1.0', 'com.example.first');
      const second = withVersion('9.2.0', 'com.example.second');
      // Two batches that follow each other, as in live mode
      const run = (environment: string, apps: DigitalExperienceMobileApp[]) =>
        [FROM, FROM + 5 * 60_000].flatMap((batchFrom) =>
          logsOf(
            generateEdotNativeSessions(
              timerange(new Date(batchFrom), new Date(batchFrom + 5 * 60_000)),
              {
                environment,
                from: FROM,
                scale: 1,
                platform: 'both',
                seed: 'digital-experience-native-shared-name',
                apps,
              }
            ).flatMap((generator) =>
              Array.from(generator).flatMap((event): EdotReactNativeDocument[] => event.serialize())
            )
          )
        );
      const describeLogs = (runLogs: OtelLogDocument[], serviceVersion: string) =>
        runLogs
          .filter(({ resource }) => resource?.attributes?.['service.version'] === serviceVersion)
          .map((doc) => `${doc['@timestamp']}:${doc.event_name}`)
          .sort();

      const together = run('together', [first, second]);
      expect(describeLogs(together, '9.1.0')).toEqual(describeLogs(run('first', [first]), '9.1.0'));
      expect(describeLogs(together, '9.2.0')).toEqual(
        describeLogs(run('second', [second]), '9.2.0')
      );
    });

    it('rejects a rollout of a version other than the newest', () => {
      const [app] = DIGITAL_EXPERIENCE_NATIVE_APPS;
      const [newest, previous, ...older] = app.versions;
      const olderRollout = {
        ...app,
        versions: [
          { ...newest, rollout: undefined },
          { ...previous, rollout: { initialAdoption: 0.5, hours: 1 } },
          ...older,
        ],
      };
      expect(() =>
        generateEdotNativeSessions(range, {
          environment: 'test',
          from: FROM,
          scale: 1,
          platform: 'both',
          seed: 'digital-experience-native-test',
          apps: [olderRollout],
        })
      ).toThrow(`${app.serviceName}: only the newest version can roll out`);
    });

    it('parses platform, scale and seed only', () => {
      expect(
        parseDigitalExperienceNativeScenarioOpts({ platform: 'ios', scale: '2', seed: 7 }, FROM)
      ).toMatchObject({ platform: 'ios', scale: 2, seed: '7' });
      expect(() =>
        parseDigitalExperienceNativeScenarioOpts({ withManualSpans: true }, FROM)
      ).toThrow('Unknown scenarioOpts: withManualSpans');
    });
  });
});
