/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  timerange,
  type EdotReactNativeDocument,
  type EdotReactNativeSpanDocument,
  type OtelLogDocument,
  type Timerange,
} from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DIGITAL_EXPERIENCE_MOBILE_APPS,
  generateEdotReactNativeSessions,
  parseDigitalExperienceMobileScenarioOpts,
  type DigitalExperienceMobileScenarioOpts,
} from './digital_experience_mobile_apps';

const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:30:00.000Z'),
  {} as ToolingLog
);

const collect = (
  opts: Partial<DigitalExperienceMobileScenarioOpts> = {},
  timeRange: Timerange = range
): EdotReactNativeDocument[] =>
  generateEdotReactNativeSessions(timeRange, {
    environment: 'test',
    from: timeRange.from.getTime(),
    scale: 1,
    platform: 'both',
    withManualSpans: true,
    // Unseeded runs are random, which could make the minimums the tests rely on flaky
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

const platformOf = (doc: EdotReactNativeDocument) =>
  (isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes)?.['telemetry.sdk.name'];

describe('digital experience mobile apps', () => {
  // A 30-minute run is enough for every app to show every signal, and shared by the tests
  let docs: EdotReactNativeDocument[];
  beforeAll(() => {
    docs = collect();
  });

  describe('parseDigitalExperienceMobileScenarioOpts', () => {
    it('defaults to both platforms, manual spans and scale 1', () => {
      expect(parseDigitalExperienceMobileScenarioOpts(undefined)).toEqual({
        scale: 1,
        platform: 'both',
        withManualSpans: true,
      });
    });

    it('parses string options from the CLI', () => {
      expect(
        parseDigitalExperienceMobileScenarioOpts({
          platform: 'iOS',
          withManualSpans: 'false',
          scale: '0.5',
          seed: 42,
        })
      ).toEqual({ platform: 'ios', withManualSpans: false, scale: 0.5, seed: '42' });
    });

    it('rejects unknown keys and invalid values', () => {
      expect(() => parseDigitalExperienceMobileScenarioOpts({ withSessionId: true })).toThrow(
        'Unknown scenarioOpts: withSessionId'
      );
      expect(() => parseDigitalExperienceMobileScenarioOpts({ platform: 'web' })).toThrow(
        'platform must be android, ios or both'
      );
      expect(() => parseDigitalExperienceMobileScenarioOpts({ withManualSpans: 'yes' })).toThrow(
        'withManualSpans must be true or false'
      );
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
      expect([...platforms].sort()).toEqual(['android', 'iOS']);
      docs.forEach((doc) => {
        const language = (isSpan(doc) ? doc.resource.attributes : doc.resource?.attributes)?.[
          'telemetry.sdk.language'
        ];
        expect(language).not.toBe('webjs');
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
      expect(new Set(iosDocs.map(platformOf))).toEqual(new Set(['iOS']));
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

    it('keeps everything within the range', () => {
      const from = range.from.getTime();
      const to = range.to.getTime();
      docs.forEach((doc) => {
        expect(doc['@timestamp']).toBeGreaterThanOrEqual(from);
        expect(doc['@timestamp']).toBeLessThan(to);
      });
    });

    it('generates the same data for the same seed, however the range is split', () => {
      const shortRange = timerange(
        range.from,
        new Date(range.from.getTime() + 5 * 60_000),
        {} as ToolingLog
      );
      const whole = collect({}, shortRange);
      const first = timerange(
        shortRange.from,
        new Date(shortRange.from.getTime() + 2 * 60_000),
        {} as ToolingLog
      );
      const second = timerange(first.to, shortRange.to, {} as ToolingLog);
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
});
