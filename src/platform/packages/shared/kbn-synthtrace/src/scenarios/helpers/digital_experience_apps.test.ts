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
    // Unseeded runs are random, which could make the minimums the tests rely on flaky
    seed: 'digital-experience-test',
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

    it('accepts a seed as a string or a number', () => {
      expect(parseDigitalExperienceScenarioOpts({ seed: 'abc' }).seed).toBe('abc');
      expect(parseDigitalExperienceScenarioOpts({ seed: 42 }).seed).toBe('42');
      expect(parseDigitalExperienceScenarioOpts(undefined).seed).toBeUndefined();
      ['', '  ', true, {}, NaN, Infinity].forEach((seed) => {
        expect(() => parseDigitalExperienceScenarioOpts({ seed })).toThrow(
          'seed must be a non-empty string or a finite number'
        );
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

    describe('seed', () => {
      const generate = (
        seed?: string,
        {
          timeRange = range,
          from = timeRange.from.getTime(),
          withSessionId = true,
          scale = 1,
        }: { timeRange?: Timerange; from?: number; withSessionId?: boolean; scale?: number } = {}
      ) =>
        generateEdotBrowserSessions(timeRange, {
          environment: 'test',
          from,
          withSessionId,
          includeRawAttribution: false,
          scale,
          seed,
        }).flatMap((generator) =>
          Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
        );
      // Key order isn't part of the data
      const sorted = (docs: EdotBrowserDocument[]) =>
        docs
          .map((doc) =>
            JSON.stringify(doc, (_key, value) =>
              value && typeof value === 'object' && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
                : value
            )
          )
          .sort();

      it('generates the same data for the same seed and different data otherwise', () => {
        const docs = generate('seed-a');

        expect(docs.length).toBeGreaterThan(0);
        expect(generate('seed-a')).toEqual(docs);
        expect(generate('seed-b')).not.toEqual(docs);
        expect(generate(undefined)).not.toEqual(generate(undefined));
      });

      it('generates the same data when the run is split into batches', () => {
        const from = range.from.getTime();
        // Batches of live mode, and of workers, don't start on whole seconds
        const batches = [0, 13.37, 61.5, 119.25, 120].map((seconds) => at(seconds));
        const batched = batches
          .slice(1)
          .flatMap((end, i) =>
            generate('seed-a', { timeRange: timerange(batches[i], end, {} as ToolingLog), from })
          );

        expect(sorted(batched)).toEqual(sorted(generate('seed-a')));
      });

      it('does not change the sessions themselves without session IDs', () => {
        const withoutSessionIds = generate('seed-a', { withSessionId: false });
        // The distro version is the only resource attribute that tells the two apart
        const asWithoutSessions = ({ attributes, resource, ...doc }: EdotBrowserDocument) => ({
          ...doc,
          resource: {
            ...resource,
            attributes: { ...resource?.attributes, 'telemetry.distro.version': '0.3.0' },
          },
          attributes: Object.fromEntries(
            Object.entries(attributes ?? {}).filter(
              ([key]) => !['session.id', 'session.previous_id', 'browser.tab.id'].includes(key)
            )
          ),
        });
        // Without session IDs a session is a single visit. With them, some get more visits, an idle
        // tab and a session.start log, and all get session attributes.
        const withSessionIds = new Set(sorted(generate('seed-a').map(asWithoutSessions)));

        expect(withoutSessionIds.length).toBeGreaterThan(0);
        sorted(withoutSessionIds).forEach((doc) => expect(withSessionIds.has(doc)).toBe(true));
        withoutSessionIds.forEach(({ attributes }) => {
          expect(attributes).not.toHaveProperty(['browser.tab.id']);
          expect(attributes).not.toHaveProperty(['session.previous_id']);
        });
      });

      describe('visits', () => {
        const hour = timerange(at(0), at(3600), {} as ToolingLog);
        // From the epoch on, so that sessions that started before the run are kept whole
        const docs = generate('seed-a', { timeRange: hour, from: 0, scale: 3 });
        const attribute = (doc: EdotBrowserDocument, key: string) => doc.attributes?.[key];
        const sessionIds = new Set(docs.map((doc) => attribute(doc, 'session.id')));
        sessionIds.delete(undefined);

        it('starts every session once, however many times the user comes back to it', () => {
          const starts = docs.filter(
            (doc) => 'event_name' in doc && doc.event_name === 'session.start'
          );

          expect(new Set(starts.map((doc) => attribute(doc, 'session.id')))).toEqual(sessionIds);
          expect(starts).toHaveLength(sessionIds.size);
        });

        it('has sessions that span two tabs', () => {
          const tabsBySession = new Map<unknown, Set<unknown>>();
          docs.forEach((doc) => {
            const id = attribute(doc, 'session.id');
            if (id) {
              tabsBySession.set(
                id,
                (tabsBySession.get(id) ?? new Set()).add(attribute(doc, 'browser.tab.id'))
              );
            }
          });

          expect([...tabsBySession.values()].some((tabs) => tabs.size > 1)).toBe(true);
        });

        it('never lets a session go idle for 30 minutes, which would end it', () => {
          const timestampsBySession = new Map<unknown, number[]>();
          docs.forEach((doc) => {
            const id = attribute(doc, 'session.id');
            if (id) {
              timestampsBySession.set(id, [
                ...(timestampsBySession.get(id) ?? []),
                Number(doc['@timestamp']),
              ]);
            }
          });

          expect(timestampsBySession.size).toBeGreaterThan(500);
          timestampsBySession.forEach((timestamps) => {
            const ordered = [...timestamps].sort((a, b) => a - b);
            ordered.slice(1).forEach((timestamp, i) => {
              expect(timestamp - ordered[i]).toBeLessThan(30 * 60_000);
            });
          });
        });

        it('lets a session expire before the one that follows it, with the tab idle in between', () => {
          const rangeOf = (predicate: (doc: EdotBrowserDocument) => boolean) => {
            const times = docs.filter(predicate).map((doc) => Number(doc['@timestamp']));
            return { first: Math.min(...times), last: Math.max(...times) };
          };
          const followers = new Map<string, string>(
            docs.flatMap((doc) => {
              const previousId = attribute(doc, 'session.previous_id');
              return typeof previousId === 'string' && sessionIds.has(previousId)
                ? [[String(attribute(doc, 'session.id')), previousId] as [string, string]]
                : [];
            })
          );

          expect(followers.size).toBeGreaterThan(10);
          followers.forEach((expiredId, id) => {
            const expired = rangeOf((doc) => attribute(doc, 'session.id') === expiredId);
            const next = rangeOf((doc) => attribute(doc, 'session.id') === id);
            const tabId = docs.find((doc) => attribute(doc, 'session.id') === id)?.attributes?.[
              'browser.tab.id'
            ];
            const idle = rangeOf(
              (doc) => !attribute(doc, 'session.id') && attribute(doc, 'browser.tab.id') === tabId
            );

            expect(next.first - expired.last).toBeGreaterThan(30 * 60_000);
            expect(idle.first).toBeGreaterThanOrEqual(expired.last + 30 * 60_000);
            expect(idle.last).toBeLessThan(next.first);
          });
        });

        it('points sessions to the expired session they follow', () => {
          const previousIds = docs.flatMap((doc) => attribute(doc, 'session.previous_id') ?? []);

          expect(previousIds.length).toBeGreaterThan(0);
          expect(previousIds.some((id) => sessionIds.has(id))).toBe(true);
        });

        it('keeps expired tabs sending requests without a session ID', () => {
          const sessionTabs = new Set(
            docs
              .filter((doc) => attribute(doc, 'session.id'))
              .map((doc) => attribute(doc, 'browser.tab.id'))
          );
          const idleDocs = docs.filter((doc) => !attribute(doc, 'session.id'));

          expect(idleDocs.length).toBeGreaterThan(0);
          idleDocs.forEach((doc) => {
            expect(sessionTabs.has(attribute(doc, 'browser.tab.id'))).toBe(true);
          });
        });

        it('never writes after the end of the run', () => {
          docs.forEach((doc) => {
            expect(Number(doc['@timestamp'])).toBeLessThan(hour.to.getTime());
          });
        });
      });

      it('does not repeat session, trace or span IDs', () => {
        const hour = timerange(at(0), at(3600), {} as ToolingLog);
        // From the epoch on, so that sessions that started before the run are kept whole
        const docs = generate('seed-a', { timeRange: hour, from: 0, scale: 3 });
        const sessionCount = docs.filter(
          (doc) => 'event_name' in doc && doc.event_name === 'session.start'
        ).length;
        // Idle tabs have no session ID
        const sessionIds = new Set(docs.flatMap((doc) => doc.attributes?.['session.id'] ?? []));
        // Resource timing logs of requests carry the IDs of their span, only count the spans
        const spans = docs.flatMap((doc) => ('kind' in doc ? [doc] : []));

        expect(sessionCount).toBeGreaterThan(500);
        expect(sessionIds.size).toBe(sessionCount);
        expect(new Set(spans.map(({ trace_id: id }) => id)).size).toBe(spans.length);
        expect(new Set(spans.map(({ span_id: id }) => id)).size).toBe(spans.length);
      });

      it('derives UUID v4 session IDs and trace IDs from the seed', () => {
        const docs = generate('seed-a');
        // Idle tabs have no session ID
        const sessionIds = new Set(docs.flatMap((doc) => doc.attributes?.['session.id'] ?? []));

        expect(sessionIds.size).toBeGreaterThan(1);
        sessionIds.forEach((id) =>
          expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
          )
        );
        docs
          .filter((doc) => 'kind' in doc)
          .forEach((doc) => {
            expect(doc).toMatchObject({
              trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
              span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
            });
          });
      });
    });

    it('sets the deployment environment, except for apps without one', () => {
      const appsWithoutEnvironment = DIGITAL_EXPERIENCE_APPS.filter(
        ({ withoutEnvironment }) => withoutEnvironment
      ).map(({ serviceName }) => serviceName);
      const docs = collect(false);

      expect(appsWithoutEnvironment.length).toBeGreaterThan(0);
      docs.forEach(({ resource }) => {
        if (appsWithoutEnvironment.includes(String(resource?.attributes?.['service.name']))) {
          expect(resource?.attributes).not.toHaveProperty(['deployment.environment.name']);
        } else {
          expect(resource?.attributes?.['deployment.environment.name']).toBe('test');
        }
      });
      expect(
        docs.some(({ resource }) =>
          appsWithoutEnvironment.includes(String(resource?.attributes?.['service.name']))
        )
      ).toBe(true);
    });

    it('reports the version of the distro that writes sessions only when sessions are enabled', () => {
      const distroVersions = (withSessionId: boolean) =>
        new Set(
          collect(withSessionId).map(
            (doc) => doc.resource?.attributes?.['telemetry.distro.version']
          )
        );

      expect(distroVersions(true)).toEqual(new Set(['0.4.0']));
      expect(distroVersions(false)).toEqual(new Set(['0.3.0']));
    });

    it('only writes session.id when enabled', () => {
      expect(collect(false).some((doc) => doc.attributes && 'session.id' in doc.attributes)).toBe(
        false
      );

      const withSessions = collect(true);
      const sessionIds = new Set(withSessions.map((doc) => doc.attributes?.['session.id']));
      sessionIds.delete(undefined);

      // Only tabs whose session expired send data without a session ID
      withSessions
        .filter((doc) => !doc.attributes?.['session.id'])
        .forEach((doc) => expect(doc.attributes).toHaveProperty(['browser.tab.id']));
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

    it('places events evenly, by absolute time and inside their batch', () => {
      const times = (timeRange: Timerange) => {
        const created: number[] = [];
        Array.from(
          generatePerMinute<EdotBrowserDocument>(timeRange, 6, ({ time }) => {
            created.push(time);
            return [];
          })
        );
        return created;
      };
      const batches = [0, 7.3, 31, 60].map((seconds) => at(seconds));
      const batchTimes = batches
        .slice(1)
        .flatMap((end, i) => times(timerange(batches[i], end, {} as ToolingLog)));

      expect(batchTimes).toEqual(times(timerange(at(0), at(60), {} as ToolingLog)));
      expect(times(timerange(at(0), at(60), {} as ToolingLog))).toEqual(
        Array.from({ length: 6 }, (_, i) => range.from.getTime() + (i + 1) * 10_000 - 1)
      );
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
