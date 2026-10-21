/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange, type EdotBrowserDocument, type OtelLogDocument } from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DIGITAL_EXPERIENCE_APPS,
  generateEdotBrowserSessions,
  parseDigitalExperienceScenarioOpts,
} from './digital_experience_apps';

const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:02:00.000Z'),
  {} as ToolingLog
);

const collect = (withSessionId: boolean, includeRawAttribution: boolean = false) =>
  generateEdotBrowserSessions(range, {
    environment: 'test',
    from: range.from.getTime(),
    withSessionId,
    includeRawAttribution,
    scale: 1,
  }).flatMap((generator) =>
    Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
  );

describe('digital experience apps', () => {
  describe('parseDigitalExperienceScenarioOpts', () => {
    it('defaults to no session.id, no raw attribution and scale 1', () => {
      expect(parseDigitalExperienceScenarioOpts(undefined)).toEqual({
        withSessionId: false,
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
      const lastTimestamp = range.to.getTime() - 60_000;
      const timestamps = collect(false).map((doc) => Number(doc['@timestamp']));

      expect(Math.min(...timestamps)).toBeGreaterThanOrEqual(range.from.getTime());
      expect(Math.max(...timestamps)).toBeLessThanOrEqual(lastTimestamp);
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
});
