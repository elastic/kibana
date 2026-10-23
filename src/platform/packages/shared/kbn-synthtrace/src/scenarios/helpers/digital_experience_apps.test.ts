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
  type EdotBrowserDocument,
  type OtelLogDocument,
  type Timerange,
} from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DIGITAL_EXPERIENCE_APPS,
  generateEdotBrowserSessions,
  generatePerMinute,
  parseDigitalExperienceScenarioOpts,
} from './digital_experience_apps';

const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:02:00.000Z'),
  {} as ToolingLog
);

const at = (offsetSeconds: number) => new Date(range.from.getTime() + offsetSeconds * 1000);

const collect = (
  withSessionId: boolean,
  includeRawAttribution: boolean = false,
  { scale = 1, timeRange = range }: { scale?: number; timeRange?: Timerange } = {}
) =>
  generateEdotBrowserSessions(timeRange, {
    environment: 'test',
    from: timeRange.from.getTime(),
    withSessionId,
    includeRawAttribution,
    scale,
  }).flatMap((generator) =>
    Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
  );

describe('digital experience apps', () => {
  describe('parseDigitalExperienceScenarioOpts', () => {
    it('defaults to session.id, no raw attribution and scale 1', () => {
      expect(parseDigitalExperienceScenarioOpts(undefined)).toEqual({
        withSessionId: true,
        includeRawAttribution: false,
        scale: 1,
      });
    });

    it('accepts typed values', () => {
      expect(
        parseDigitalExperienceScenarioOpts({
          withSessionId: false,
          includeRawAttribution: true,
          scale: 3,
        })
      ).toEqual({ withSessionId: false, includeRawAttribution: true, scale: 3 });
    });

    it('parses string options from the CLI', () => {
      expect(
        parseDigitalExperienceScenarioOpts({
          withSessionId: 'true',
          includeRawAttribution: 'true',
          scale: '2.5',
        })
      ).toEqual({
        withSessionId: true,
        includeRawAttribution: true,
        scale: 2.5,
      });
    });

    it('rejects unknown and invalid options', () => {
      expect(() => parseDigitalExperienceScenarioOpts({ sessionId: true })).toThrow(
        'Unknown scenarioOpts: sessionId'
      );
      expect(() => parseDigitalExperienceScenarioOpts({ toString: 'x' })).toThrow(
        'Unknown scenarioOpts: toString'
      );
      ['0', 0, -1, 'abc', '2x', '', Infinity].forEach((scale) => {
        expect(() => parseDigitalExperienceScenarioOpts({ scale })).toThrow(
          'scale must be a positive number'
        );
      });
      ['yes', '1', 1, ''].forEach((withSessionId) => {
        expect(() => parseDigitalExperienceScenarioOpts({ withSessionId })).toThrow(
          'withSessionId must be true or false'
        );
      });
      expect(() => parseDigitalExperienceScenarioOpts({ includeRawAttribution: 'on' })).toThrow(
        'includeRawAttribution must be true or false'
      );
    });
  });

  describe('generateEdotBrowserSessions', () => {
    it('generates data for every app in the catalogue', () => {
      const serviceNames = new Set(
        collect(false).map((doc) => doc.resource?.attributes?.['service.name'])
      );

      expect([...serviceNames].sort()).toEqual(
        DIGITAL_EXPERIENCE_APPS.map(({ serviceName }) => serviceName).sort()
      );
    });

    it('only writes web vital attribution bodies when enabled', () => {
      const webVitals = (docs: EdotBrowserDocument[]) =>
        docs.filter(
          (doc): doc is OtelLogDocument =>
            'event_name' in doc && doc.event_name === 'browser.web_vital'
        );

      const withoutAttribution = webVitals(collect(false));
      expect(withoutAttribution.length).toBeGreaterThan(0);
      withoutAttribution.forEach((doc) => {
        expect(doc).not.toHaveProperty('body');
      });
      const withAttribution = webVitals(collect(false, true));
      expect(withAttribution.length).toBeGreaterThan(0);
      withAttribution.forEach((doc) => {
        expect(JSON.parse(String(doc.body?.text))).toEqual(expect.any(Object));
      });
    });

    it('keeps sessions between the start of the run and the last generated timestamp', () => {
      const lastTimestamp = range.to.getTime() - 1;
      const timestamps = collect(false).map((doc) => Number(doc['@timestamp']));

      expect(Math.min(...timestamps)).toBeGreaterThanOrEqual(range.from.getTime());
      expect(Math.max(...timestamps)).toBeLessThanOrEqual(lastTimestamp);
    });

    it('generates data for runs of one minute or less', () => {
      [60, 30].forEach((seconds) => {
        const shortRange = timerange(range.from, at(seconds), {} as ToolingLog);
        const docs = collect(false, false, { timeRange: shortRange });

        expect(docs.length).toBeGreaterThan(0);
        docs.forEach((doc) => {
          expect(Number(doc['@timestamp'])).toBeGreaterThanOrEqual(shortRange.from.getTime());
          expect(Number(doc['@timestamp'])).toBeLessThan(shortRange.to.getTime());
        });
      });
    });

    it('sets the deployment environment', () => {
      collect(false).forEach((doc) => {
        expect(doc.resource?.attributes?.['deployment.environment.name']).toBe('test');
      });
    });

    it('only writes session.id when enabled', () => {
      expect(collect(false).some((doc) => doc.attributes && 'session.id' in doc.attributes)).toBe(
        false
      );

      const withSessions = collect(true);
      const sessionIds = new Set(withSessions.map((doc) => doc.attributes?.['session.id']));

      expect(sessionIds.has(undefined)).toBe(false);
      expect(sessionIds.size).toBeGreaterThan(DIGITAL_EXPERIENCE_APPS.length);
    });
  });

  describe('generatePerMinute', () => {
    const indices = (timeRange: Timerange, perMinute: number) => {
      const created: number[] = [];
      Array.from(
        generatePerMinute<EdotBrowserDocument>(timeRange, perMinute, ({ index }) => {
          created.push(index);
          return [];
        })
      );
      return created;
    };

    it('creates as many events as the rate says over a run', () => {
      expect(indices(range, 6)).toHaveLength(12);
      expect(indices(range, 0.5)).toHaveLength(1);
    });

    it('creates the same events whatever the batch size', () => {
      // Live mode uploads batches of one second, each generated on its own
      const liveBatches = Array.from({ length: 120 }, (_, second) =>
        indices(timerange(at(second), at(second + 1), {} as ToolingLog), 7.5)
      ).flat();

      expect(liveBatches).toEqual(indices(range, 7.5));
      expect(liveBatches).toHaveLength(15);
    });

    it('creates events in runs of less than a minute', () => {
      expect(indices(timerange(at(0), at(30), {} as ToolingLog), 6).length).toBeGreaterThan(0);
      expect(indices(timerange(at(0), at(0.5), {} as ToolingLog), 600).length).toBeGreaterThan(0);
    });

    it('keeps fractional rates, so apps stay apart at a low scale', () => {
      const fiveMinutes = timerange(at(0), at(300), {} as ToolingLog);

      expect(indices(fiveMinutes, 6 * 0.2)).toHaveLength(6);
      expect(indices(fiveMinutes, 1 * 0.2)).toHaveLength(1);
    });

    it('numbers events by absolute time', () => {
      expect(indices(timerange(at(0), at(60), {} as ToolingLog), 3)).toEqual(
        indices(range, 3).slice(0, 3)
      );
    });
  });
});
