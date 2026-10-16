/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange, type EdotBrowserDocument } from '@kbn/synthtrace-client';
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

const collect = (withSessionId: boolean) =>
  generateEdotBrowserSessions(range, { environment: 'test', withSessionId, scale: 1 }).flatMap(
    (generator) =>
      Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
  );

describe('digital experience apps', () => {
  describe('parseDigitalExperienceScenarioOpts', () => {
    it('defaults to no session.id and scale 1', () => {
      expect(parseDigitalExperienceScenarioOpts(undefined)).toEqual({
        withSessionId: false,
        scale: 1,
      });
    });

    it('parses string options from the CLI', () => {
      expect(parseDigitalExperienceScenarioOpts({ withSessionId: 'true', scale: '2.5' })).toEqual({
        withSessionId: true,
        scale: 2.5,
      });
    });

    it('rejects unknown and invalid options', () => {
      expect(() => parseDigitalExperienceScenarioOpts({ sessionId: true })).toThrow(
        'Unknown scenarioOpts: sessionId'
      );
      expect(() => parseDigitalExperienceScenarioOpts({ scale: 0 })).toThrow(
        'scale must be a positive number'
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
