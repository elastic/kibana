/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import {
  ATTR_APP_START_DURATION,
  ATTR_ERROR_KIND,
  ATTR_SCREEN_NAME,
  ATTR_SESSION_PREVIOUS_ID,
  ATTR_START_TYPE,
  ERROR_KIND_ANR,
  ERROR_KIND_HANG,
  EVENT_APP_CRASH,
  EVENT_APP_START,
  EVENT_EXCEPTION,
  EVENT_SCREEN_CLICK,
  EVENT_SESSION_END,
  EVENT_SESSION_START,
  EVENT_WIDGET_CLICK,
  MOBILE_SPAN_KIND,
  SPAN_SCREEN_LOAD,
  timerange,
  type ApmFields,
  type Timerange,
} from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../../cli/scenario';
import type { SynthtraceClients } from '../../cli/utils/clients_manager';
import { createLogger, LogLevel } from '../../lib/utils/create_logger';
import type { OtelDocument } from '../../lib/otel/otel_synthtrace_es_client';
import type { SynthGenerator } from '../../lib/utils/with_client';
import singleInstallation from '../../scenarios/digital_experience_mobile_single_installation';
import singleSession from '../../scenarios/digital_experience_mobile_single_session';
import native from '../../scenarios/digital_experience_mobile_native';
import mixed from '../../scenarios/digital_experience_mixed';
import {
  DIGITAL_EXPERIENCE_MOBILE_APPS,
  DIGITAL_EXPERIENCE_NATIVE_APPS,
} from '../../scenarios/helpers/digital_experience_mobile_apps';

const MINUTE_MS = 60_000;
const logger = createLogger(LogLevel.error);
// generate only hands the clients over with the generators
const clients = { otelEsClient: {}, apmEsClient: {} } as SynthtraceClients;

/** The documents a scenario generates for `range`, evaluated with the run's `from` and `to`. */
const run = async <TFields extends OtelDocument | ApmFields>(
  scenario: Scenario<TFields>,
  {
    scenarioOpts,
    from,
    to,
    range = timerange(from, to, logger),
  }: { scenarioOpts: Record<string, unknown>; from: number; to: number; range?: Timerange }
): Promise<TFields[]> => {
  const { generate } = await scenario({ scenarioOpts, logger, from, to } as ScenarioInitOptions);
  const generatorsOf = (generator: SynthGenerator<TFields>) => {
    if (generator instanceof Readable) {
      throw new Error('Expected synthtrace generators');
    }
    return Array.isArray(generator) ? generator : [generator];
  };
  return [generate({ range, clients })]
    .flat()
    .flatMap(({ generator }) => generatorsOf(generator))
    .flatMap((generator) => Array.from(generator).flatMap((event) => event.serialize()));
};

/** When each session starts and ends, in the order they start. */
const sessionsOf = (docs: OtelDocument[]) => {
  const sessions = new Map<string, { start: number; end: number }>();
  // Span events have no session.id
  docs.forEach((doc) => {
    const sessionId = doc.attributes?.['session.id'];
    if (sessionId === undefined) {
      return;
    }
    const time = Number(doc['@timestamp']);
    const end = time + ('kind' in doc ? (doc.duration ?? 0) / 1_000_000 : 0);
    const session = sessions.get(String(sessionId)) ?? { start: time, end };
    sessions.set(String(sessionId), {
      start: Math.min(session.start, time),
      end: Math.max(session.end, end),
    });
  });
  return [...sessions.values()].sort((a, b) => a.start - b.start);
};

const attributesOf = (doc: OtelDocument): Record<string, unknown> => doc.attributes ?? {};
const resourceOf = (doc: OtelDocument): Record<string, unknown> => doc.resource?.attributes ?? {};
const eventNameOf = (doc: OtelDocument): string | undefined =>
  'kind' in doc ? undefined : doc.event_name;
const countBy = (values: Array<string | undefined>) => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (value !== undefined) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  });
  return counts;
};

describe('digital experience mobile scenarios', () => {
  describe('digital_experience_mobile_single_installation', () => {
    const from = new Date('2026-10-16T00:00:00.000Z').getTime();
    const to = from + 24 * 60 * MINUTE_MS;

    it('keeps the sessions of the installation more than 30 minutes apart, whatever the scale', async () => {
      for (const scenarioOpts of [
        { seed: 'single-installation' },
        { seed: 'single-installation', platform: 'ios' },
        { seed: 'single-installation', scale: 4 },
      ]) {
        const sessions = sessionsOf(await run(singleInstallation, { scenarioOpts, from, to }));
        expect(sessions.length).toBeGreaterThan(10);
        sessions.slice(1).forEach(({ start }, i) => {
          expect(start - sessions[i].end).toBeGreaterThan(30 * MINUTE_MS);
        });
      }
    });
  });

  describe('digital_experience_mobile_single_session', () => {
    const from = new Date('2026-10-16T12:00:00.000Z').getTime();
    const to = from + 30 * MINUTE_MS;

    it('indexes the session once when the run is split among workers', async () => {
      const scenarioOpts = { platform: 'ios', health: 'critical', visits: 2, screenViews: 6 };
      const unsplit = await run(singleSession, { scenarioOpts, from, to });
      // Like a historical run with 10 workers, each evaluating the scenario with the run's from/to
      const bounds = Array.from({ length: 11 }, (_, i) => from + i * 3 * MINUTE_MS);
      const split = (
        await Promise.all(
          bounds.slice(1).map((end, i) =>
            run(singleSession, {
              scenarioOpts,
              from,
              to,
              range: timerange(bounds[i], end, logger),
            })
          )
        )
      ).flat();

      expect(unsplit.length).toBeGreaterThan(0);
      const sortKey = (doc: OtelDocument) => JSON.stringify(doc);
      expect(split.map(sortKey).sort()).toEqual(unsplit.map(sortKey).sort());
      const spanIds = unsplit.filter((doc) => 'kind' in doc).map((doc) => doc.span_id);
      expect(new Set(spanIds).size).toBe(spanIds.length);
      unsplit.forEach((doc) => {
        expect(Number(doc['@timestamp'])).toBeGreaterThanOrEqual(from);
        expect(Number(doc['@timestamp'])).toBeLessThan(to);
      });
    });
  });

  describe('digital_experience_mobile_native', () => {
    const from = new Date('2026-10-16T12:00:00.000Z').getTime();
    // Longer than a cycle of the installations, so that sessions have a previous session in the run
    const to = from + 120 * MINUTE_MS;
    const SERVICES = ['trailmap-android', 'ride-ios', 'transit-companion'];
    let docs: OtelDocument[];

    beforeAll(async () => {
      docs = await run(native, { scenarioOpts: { seed: 'native', scale: 0.25 }, from, to });
    });

    const sessionIdOf = (doc: OtelDocument) => {
      const sessionId = attributesOf(doc)['session.id'];
      return sessionId === undefined ? undefined : String(sessionId);
    };
    const serviceOf = (doc: OtelDocument) => String(resourceOf(doc)['service.name']);

    it('writes both platforms and every proposed signal', () => {
      const osNames = new Set(docs.map((doc) => resourceOf(doc)['os.name']).filter(Boolean));
      expect(osNames).toContain('Android');
      expect(osNames.size).toBeGreaterThan(1);

      const eventNames = new Set(docs.map(eventNameOf));
      [
        EVENT_SESSION_START,
        EVENT_SESSION_END,
        EVENT_APP_START,
        EVENT_SCREEN_CLICK,
        EVENT_WIDGET_CLICK,
      ].forEach((name) => expect(eventNames).toContain(name));

      const spanNames = new Set(docs.flatMap((doc) => ('kind' in doc ? [doc.name] : [])));
      expect(spanNames).toContain(SPAN_SCREEN_LOAD);

      const attributeNames = new Set(docs.flatMap((doc) => Object.keys(attributesOf(doc))));
      [
        ATTR_SESSION_PREVIOUS_ID,
        ATTR_START_TYPE,
        ATTR_APP_START_DURATION,
        ATTR_SCREEN_NAME,
        ATTR_ERROR_KIND,
      ].forEach((name) => expect(attributeNames).toContain(name));

      const handledErrors = docs.filter(
        (doc) => eventNameOf(doc) === EVENT_EXCEPTION && doc.span_id === undefined
      );
      expect(handledErrors.length).toBeGreaterThan(0);
      handledErrors.forEach((doc) => {
        expect(attributesOf(doc)[ATTR_SCREEN_NAME]).toEqual(expect.any(String));
      });

      const errorKinds = new Set(docs.map((doc) => attributesOf(doc)[ATTR_ERROR_KIND]));
      expect(errorKinds).toContain(ERROR_KIND_ANR);
      expect(errorKinds).toContain(ERROR_KIND_HANG);
    });

    it('writes native apps only', () => {
      expect(new Set(docs.map(serviceOf).filter((name) => SERVICES.includes(name)))).toEqual(
        new Set(SERVICES)
      );
      const json = JSON.stringify(docs);
      expect(json).not.toContain('JavascriptException');
      expect(json).not.toContain('RNSScreen');
    });

    it('starts every session once, and every crash belongs to one of them', () => {
      const starts = countBy(
        docs.map((doc) => (eventNameOf(doc) === EVENT_SESSION_START ? sessionIdOf(doc) : undefined))
      );
      const sessionIds = new Set(docs.map(sessionIdOf).filter((id) => id !== undefined));
      expect(sessionIds.size).toBeGreaterThan(10);
      sessionIds.forEach((sessionId) => expect(starts.get(String(sessionId))).toBe(1));

      const crashes = docs.filter((doc) => eventNameOf(doc) === EVENT_APP_CRASH);
      expect(crashes.length).toBeGreaterThan(0);
      crashes.forEach((crash) => expect(starts.has(String(sessionIdOf(crash)))).toBe(true));
    });

    it('parents every backend SERVER span with a mobile CLIENT span of the same trace', () => {
      const clientSpans = new Map(
        docs.flatMap((doc) =>
          'kind' in doc && doc.kind === MOBILE_SPAN_KIND.CLIENT && SERVICES.includes(serviceOf(doc))
            ? [[doc.span_id, doc] as const]
            : []
        )
      );
      const servers = docs.flatMap((doc) =>
        'kind' in doc && doc.kind === MOBILE_SPAN_KIND.SERVER ? [doc] : []
      );
      expect(servers.length).toBeGreaterThan(0);
      servers.forEach((server) => {
        expect(SERVICES).not.toContain(serviceOf(server));
        const parent = clientSpans.get(String(server.parent_span_id));
        expect(parent?.trace_id).toBe(server.trace_id);
      });
    });

    it('gives every app three versions with different crash counts', () => {
      SERVICES.forEach((service) => {
        const ofService = docs.filter((doc) => serviceOf(doc) === service);
        const versions = new Set(ofService.map((doc) => resourceOf(doc)['service.version']));
        expect(versions.size).toBeGreaterThanOrEqual(3);

        const crashesByVersion = countBy(
          ofService
            .filter((doc) => eventNameOf(doc) === EVENT_APP_CRASH)
            .map((doc) => String(resourceOf(doc)['service.version']))
        );
        expect(new Set(crashesByVersion.values()).size).toBeGreaterThan(1);
      });
    });

    it('writes one platform only when asked to, and rejects options it does not know', async () => {
      // Both SDKs write their name on every session start, unlike `os.type`, which Android lacks
      const sdkNamesOfSessions = (platformDocs: OtelDocument[]) =>
        new Set(
          platformDocs
            .filter((doc) => eventNameOf(doc) === EVENT_SESSION_START)
            .map((doc) => resourceOf(doc)['telemetry.sdk.name'])
        );
      const ios = await run(native, {
        scenarioOpts: { seed: 'native', platform: 'ios', scale: 0.25 },
        from,
        to,
      });
      const android = await run(native, {
        scenarioOpts: { seed: 'native', platform: 'android', scale: 0.25 },
        from,
        to,
      });
      expect(sdkNamesOfSessions(ios)).toEqual(new Set(['iOS']));
      expect(sdkNamesOfSessions(android)).toEqual(new Set(['android']));
      await expect(
        run(native, { scenarioOpts: { withManualSpans: false }, from, to })
      ).rejects.toThrow('Unknown scenarioOpts: withManualSpans');
    });
  });

  describe('digital_experience_mixed', () => {
    const from = new Date('2026-10-16T12:00:00.000Z').getTime();
    const to = from + 30 * MINUTE_MS;
    const NATIVE_SERVICES = DIGITAL_EXPERIENCE_NATIVE_APPS.map(({ serviceName }) => serviceName);
    const REACT_NATIVE_SERVICES = DIGITAL_EXPERIENCE_MOBILE_APPS.map(
      ({ serviceName }) => serviceName
    );
    let docs: Array<OtelDocument | ApmFields>;

    beforeAll(async () => {
      docs = await run(mixed, { scenarioOpts: { seed: 'mixed' }, from, to });
    });

    const isOtel = (doc: OtelDocument | ApmFields): doc is OtelDocument => 'resource' in doc;
    const otelServiceOf = (doc: OtelDocument) => String(resourceOf(doc)['service.name']);

    it('writes the React Native, native and classic apps next to each other', () => {
      const otelServices = new Set(
        docs.flatMap((doc) => (isOtel(doc) ? [otelServiceOf(doc)] : []))
      );
      [...REACT_NATIVE_SERVICES, ...NATIVE_SERVICES].forEach((service) =>
        expect(otelServices).toContain(service)
      );
      const classicServices = new Set(
        docs.flatMap((doc) => (isOtel(doc) ? [] : [doc['service.name']]))
      );
      expect(classicServices).toContain('storefront-web');
    });

    it('writes the proposed signals for the native mobile apps only', () => {
      const mobileServicesWithSessionStart = new Set(
        docs.flatMap((doc) =>
          isOtel(doc) && eventNameOf(doc) === EVENT_SESSION_START ? [otelServiceOf(doc)] : []
        )
      );
      NATIVE_SERVICES.forEach((service) =>
        expect(mobileServicesWithSessionStart).toContain(service)
      );
      REACT_NATIVE_SERVICES.forEach((service) =>
        expect(mobileServicesWithSessionStart).not.toContain(service)
      );
    });
  });
});
