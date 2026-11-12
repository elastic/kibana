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
  type EdotBrowserSpanDocument,
  type OtelLogDocument,
  type Timerange,
} from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DIGITAL_EXPERIENCE_APPS,
  generateEdotBrowserSessions,
  generatePerMinute,
  getDefaultSeed,
  parseDigitalExperienceScenarioOpts,
} from './digital_experience_apps';
import { DIGITAL_EXPERIENCE_EDGE_CASES } from './digital_experience_edge_cases';

const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:02:00.000Z'),
  {} as ToolingLog
);

const FROM = range.from.getTime();

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
    environments: false,
    edgeCases: false,
    scale,
    // Pin the seed so the minimums the tests rely on don't depend on the range's start
    seed: 'digital-experience-test',
  }).flatMap((generator) =>
    Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
  );

// Failing: See https://github.com/elastic/kibana/issues/303882
describe.skip('digital experience apps', () => {
  describe('parseDigitalExperienceScenarioOpts', () => {
    it('defaults to session.id, no raw attribution, one environment, no edge cases and scale 1', () => {
      expect(parseDigitalExperienceScenarioOpts(undefined, FROM)).toEqual({
        withSessionId: true,
        includeRawAttribution: false,
        environments: false,
        edgeCases: false,
        scale: 1,
        seed: getDefaultSeed(FROM),
      });
    });

    it('accepts typed values', () => {
      expect(
        parseDigitalExperienceScenarioOpts(
          {
            withSessionId: false,
            includeRawAttribution: true,
            environments: true,
            edgeCases: true,
            scale: 3,
          },
          FROM
        )
      ).toEqual({
        withSessionId: false,
        includeRawAttribution: true,
        environments: true,
        edgeCases: true,
        scale: 3,
        seed: getDefaultSeed(FROM),
      });
    });

    it('parses string options from the CLI', () => {
      expect(
        parseDigitalExperienceScenarioOpts(
          {
            withSessionId: 'true',
            includeRawAttribution: 'true',
            environments: 'true',
            edgeCases: 'true',
            scale: '2.5',
          },
          FROM
        )
      ).toEqual({
        withSessionId: true,
        includeRawAttribution: true,
        environments: true,
        edgeCases: true,
        scale: 2.5,
        seed: getDefaultSeed(FROM),
      });
    });

    it('accepts a seed as a string or a number', () => {
      expect(parseDigitalExperienceScenarioOpts({ seed: 'abc' }, FROM).seed).toBe('abc');
      expect(parseDigitalExperienceScenarioOpts({ seed: 42 }, FROM).seed).toBe('42');
      expect(parseDigitalExperienceScenarioOpts(undefined, FROM).seed).toBe(String(FROM));
      ['', '  ', true, {}, NaN, Infinity].forEach((seed) => {
        expect(() => parseDigitalExperienceScenarioOpts({ seed }, FROM)).toThrow(
          'seed must be a non-empty string or a finite number'
        );
      });
    });

    it('rejects unknown and invalid options', () => {
      expect(() => parseDigitalExperienceScenarioOpts({ sessionId: true }, FROM)).toThrow(
        'Unknown scenarioOpts: sessionId'
      );
      expect(() => parseDigitalExperienceScenarioOpts({ toString: 'x' }, FROM)).toThrow(
        'Unknown scenarioOpts: toString'
      );
      ['0', 0, -1, 'abc', '2x', '', Infinity].forEach((scale) => {
        expect(() => parseDigitalExperienceScenarioOpts({ scale }, FROM)).toThrow(
          'scale must be a positive number'
        );
      });
      ['yes', '1', 1, ''].forEach((withSessionId) => {
        expect(() => parseDigitalExperienceScenarioOpts({ withSessionId }, FROM)).toThrow(
          'withSessionId must be true or false'
        );
      });
      expect(() =>
        parseDigitalExperienceScenarioOpts({ includeRawAttribution: 'on' }, FROM)
      ).toThrow('includeRawAttribution must be true or false');
      expect(() => parseDigitalExperienceScenarioOpts({ environments: 'all' }, FROM)).toThrow(
        'environments must be true or false'
      );
      expect(() => parseDigitalExperienceScenarioOpts({ edgeCases: 'many' }, FROM)).toThrow(
        'edgeCases must be true or false'
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
          environments: false,
          edgeCases: false,
          scale,
          // Like the scenarios, without a seed option the parser defaults it to the run's start
          seed: parseDigitalExperienceScenarioOpts(seed === undefined ? {} : { seed }, from).seed,
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
      });

      it('derives the default seed from the start of the run, which all its batches share', () => {
        const from = range.from.getTime();
        // Synthtrace evaluates the scenario again in every worker and for every live batch
        const batches = [0, 61.5, 120].map((seconds) => at(seconds));
        const batched = batches
          .slice(1)
          .flatMap((end, i) =>
            generate(undefined, { timeRange: timerange(batches[i], end, {} as ToolingLog), from })
          );

        expect(sorted(batched)).toEqual(sorted(generate(undefined)));
        expect(generate(undefined)).toEqual(generate(getDefaultSeed(from)));
        // A run that starts a millisecond earlier cuts off almost nothing else, but has other sessions
        const earlier = generate(undefined, { from: from - 1 });
        const sessionIds = (docs: EdotBrowserDocument[]) =>
          new Set(docs.map(({ attributes }) => attributes?.['session.id']).filter(Boolean));
        const earlierSessionIds = sessionIds(earlier);
        expect(earlier).toEqual(generate(getDefaultSeed(from - 1), { from: from - 1 }));
        expect(earlierSessionIds.size).toBeGreaterThan(0);
        sessionIds(generate(undefined)).forEach((sessionId) =>
          expect(earlierSessionIds.has(sessionId)).toBe(false)
        );
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

  describe('catalogue', () => {
    // Half an hour of every app, with the traffic of two, to see rare cases too
    const halfHour = timerange(at(0), at(1800), {} as ToolingLog);
    const generate = (environments: boolean, edgeCases: boolean = false) =>
      generateEdotBrowserSessions(halfHour, {
        environment: 'test',
        from: halfHour.from.getTime(),
        withSessionId: true,
        includeRawAttribution: false,
        environments,
        edgeCases,
        scale: 2,
        seed: 'digital-experience-test',
      }).flatMap((generator) =>
        Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
      );
    const docs = generate(false);
    const withEnvironments = generate(true);
    const withEdgeCases = generate(false, true);

    const attribute = (doc: EdotBrowserDocument, key: string) => doc.attributes?.[key];
    const appDocs = (all: EdotBrowserDocument[], serviceName: string) =>
      all.filter((doc) => doc.resource?.attributes?.['service.name'] === serviceName);
    const environmentOf = (doc: EdotBrowserDocument) =>
      doc.resource?.attributes?.['deployment.environment.name'];
    const eventsOf = (all: EdotBrowserDocument[], eventName: string) =>
      all.filter((doc) => 'event_name' in doc && doc.event_name === eventName);
    const count = <TValue>(values: TValue[]) => {
      const counts = new Map<TValue, number>();
      values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
      return counts;
    };
    const errorGroups = (all: EdotBrowserDocument[]) =>
      count(
        eventsOf(all, 'exception').map(
          (doc) => `${attribute(doc, 'exception.type')}\n${attribute(doc, 'exception.stacktrace')}`
        )
      );
    const pageLoadResourceUrls = (all: EdotBrowserDocument[]) =>
      count(
        eventsOf(all, 'browser.resource_timing')
          .filter(
            (doc) =>
              !['fetch', 'xmlhttprequest'].includes(
                String(attribute(doc, 'browser.resource_timing.initiator_type'))
              )
          )
          .map((doc) => String(attribute(doc, 'url.full')))
      );
    const requests = (all: EdotBrowserDocument[]) =>
      all.filter((doc): doc is EdotBrowserSpanDocument => 'kind' in doc);

    describe('stack traces', () => {
      it('groups the exceptions of an app in a few groups, each with several occurrences', () => {
        ['checkout-web', 'support-center-web'].forEach((serviceName) => {
          const occurrences = eventsOf(appDocs(docs, serviceName), 'exception').length;
          const groups = [...errorGroups(appDocs(docs, serviceName)).values()];

          expect(occurrences).toBeGreaterThan(50);
          // Random stack traces make every occurrence a group of its own
          expect(groups.length).toBeLessThan(occurrences / 3);
          expect(Math.max(...groups)).toBeGreaterThan(5);
          // Groups differ in size, so that sorting them by occurrences means something. There are
          // more of them than stacks, as Firefox and Safari write stack traces in their own way.
          expect(new Set(groups).size).toBeGreaterThan(5);
        });
      });

      it('has the files and function names of the app in its stack traces', () => {
        const traces = (serviceName: string) =>
          eventsOf(appDocs(docs, serviceName), 'exception').map((doc) =>
            String(attribute(doc, 'exception.stacktrace'))
          );

        expect(
          traces('checkout-web').some((trace) => trace.includes('PaymentForm.handleSubmit'))
        ).toBe(true);
        expect(traces('checkout-web').join('\n')).toContain('/static/js/checkout.c02e7f.js:1:');
        expect(traces('support-center-web').join('\n')).toContain('/bundle/app.js:1:');
        // Frames of other apps' bundles don't leak in
        expect(traces('support-center-web').join('\n')).not.toContain('checkout.c02e7f');
      });
    });

    describe('environments', () => {
      it('keeps a single environment per app unless asked, with the apps without one still bare', () => {
        DIGITAL_EXPERIENCE_APPS.forEach(({ serviceName, withoutEnvironment }) => {
          expect(new Set(appDocs(docs, serviceName).map(environmentOf))).toEqual(
            new Set([withoutEnvironment ? undefined : 'test'])
          );
        });
      });

      it('spreads each app over its environments with the traffic of their weights', () => {
        DIGITAL_EXPERIENCE_APPS.forEach(({ serviceName, environments = [] }) => {
          const sessions = (environment?: string) =>
            new Set(
              appDocs(withEnvironments, serviceName)
                .filter((doc) => environmentOf(doc) === environment)
                .map((doc) => attribute(doc, 'session.id'))
            ).size;
          const total = environments.reduce((sum, { weight }) => sum + weight, 0);
          const allSessions = environments.reduce((sum, { name }) => sum + sessions(name), 0);

          expect(environments.length).toBeGreaterThan(1);
          environments.forEach(({ name, weight }) => {
            // Sessions are few for the apps with little traffic, and sampled: an equal split
            // between environments is way off
            expect(Math.abs(sessions(name) / allSessions - weight / total)).toBeLessThan(0.15);
          });
        });
      });

      it('lists production, staging and a preview for the storefront and the checkout', () => {
        ['storefront-web', 'checkout-web'].forEach((serviceName) => {
          expect(new Set(appDocs(withEnvironments, serviceName).map(environmentOf))).toEqual(
            new Set(['production', 'staging', 'preview'])
          );
        });
      });

      it('keeps docs-web in production and without any environment', () => {
        expect(new Set(appDocs(withEnvironments, 'docs-web').map(environmentOf))).toEqual(
          new Set(['production', undefined])
        );
      });

      it('has page loads but no exceptions and no resources in the preview', () => {
        ['storefront-web', 'checkout-web', 'media-portal-web'].forEach((serviceName) => {
          const preview = appDocs(withEnvironments, serviceName).filter(
            (doc) => environmentOf(doc) === 'preview'
          );

          expect(eventsOf(preview, 'browser.navigation_timing').length).toBeGreaterThan(0);
          expect(eventsOf(preview, 'browser.web_vital').length).toBeGreaterThan(0);
          expect(requests(preview).length).toBeGreaterThan(0);
          expect(eventsOf(preview, 'exception')).toHaveLength(0);
          expect(eventsOf(preview, 'browser.resource_timing')).toHaveLength(0);
        });
      });

      it('has errors that only happen in one environment, so groups come and go with it', () => {
        const groupsIn = (environment: string) =>
          new Set(
            errorGroups(
              appDocs(withEnvironments, 'checkout-web').filter(
                (doc) => environmentOf(doc) === environment
              )
            ).keys()
          );
        const production = groupsIn('production');
        const staging = groupsIn('staging');

        expect([...production].some((group) => !staging.has(group))).toBe(true);
        expect([...staging].some((group) => !production.has(group))).toBe(true);
        expect([...staging].some((group) => group.includes('new-payment-flow'))).toBe(true);
        expect([...production].some((group) => group.includes('new-payment-flow'))).toBe(false);
      });

      it('generates the sessions of every environment from the seed', () => {
        expect(generate(true)).toEqual(withEnvironments);
        const sessionIds = (all: EdotBrowserDocument[]) =>
          eventsOf(all, 'session.start').map((doc) => attribute(doc, 'session.id'));

        expect(new Set(sessionIds(withEnvironments)).size).toBe(
          sessionIds(withEnvironments).length
        );
      });
    });

    describe('edge cases', () => {
      const lengths = (all: EdotBrowserDocument[]) =>
        all.map((doc) => String(attribute(doc, 'url.full')).length);
      const tracesOf = (all: EdotBrowserDocument[]) =>
        eventsOf(all, 'exception')
          .map((doc) => attribute(doc, 'exception.stacktrace'))
          .filter((trace): trace is string => typeof trace === 'string');

      it('adds nothing out of the ordinary without the option', () => {
        const exceptions = eventsOf(docs, 'exception');

        expect(
          Math.max(...lengths([...eventsOf(docs, 'browser.resource_timing'), ...requests(docs)]))
        ).toBeLessThan(1_024);
        expect(Math.max(...tracesOf(docs).map((trace) => trace.length))).toBeLessThan(8_191);
        expect(
          exceptions.every(
            (doc) =>
              attribute(doc, 'exception.type') !== undefined &&
              attribute(doc, 'exception.stacktrace') !== undefined
          )
        ).toBe(true);
        expect(docs.every((doc) => doc.resource?.attributes?.['browser.name'])).toBe(true);
      });

      it('has URLs of thousands of characters, in resources and in requests', () => {
        expect(
          Math.max(...lengths(eventsOf(withEdgeCases, 'browser.resource_timing')))
        ).toBeGreaterThan(2_083);
        expect(Math.max(...lengths(requests(withEdgeCases)))).toBeGreaterThan(4_000);
      });

      it('has stack traces of dozens of frames, one of them over 8,191 characters', () => {
        const traces = tracesOf(withEdgeCases);

        expect(Math.max(...traces.map((trace) => trace.length))).toBeGreaterThan(8_191);
        expect(Math.max(...traces.map((trace) => trace.split('\n').length))).toBeGreaterThan(50);
      });

      it('has a stack trace just under 8,191 characters, and one over', () => {
        const lengthsOf = (message: string) =>
          eventsOf(withEdgeCases, 'exception')
            .filter((doc) => attribute(doc, 'exception.message') === message)
            .map((doc) => String(attribute(doc, 'exception.stacktrace')).length);

        // The longest ones are the ones of Chromium, which also writes the error and indents
        expect(
          Math.max(
            ...lengthsOf(
              'Too many re-renders. React limits the number of renders to prevent an infinite loop.'
            )
          )
        ).toBeLessThan(8_191);
        expect(
          Math.max(
            ...lengthsOf(
              'Too many re-renders. React limits the number of renders to prevent an infinite loop.'
            )
          )
        ).toBeGreaterThan(7_000);
        expect(Math.min(...lengthsOf('Maximum update depth exceeded'))).toBeGreaterThan(8_191);
      });

      it('has the errors that one engine words or throws in the sessions of that engine only', () => {
        // Rare ones, as only the sessions of one engine throw them: three hours of traffic
        const threeHours = timerange(at(0), at(3 * 3_600), {} as ToolingLog);
        const longRun = generateEdotBrowserSessions(threeHours, {
          environment: 'test',
          from: threeHours.from.getTime(),
          withSessionId: true,
          includeRawAttribution: false,
          environments: false,
          edgeCases: true,
          scale: 1,
          seed: 'digital-experience-test',
        }).flatMap((generator) =>
          Array.from(generator).flatMap((event): EdotBrowserDocument[] => event.serialize())
        );
        const userAgentsOf = (message: string) =>
          eventsOf(longRun, 'exception')
            .filter((doc) => attribute(doc, 'exception.message') === message)
            .map((doc) => String(doc.resource?.attributes?.['user_agent.original']));
        const javaScriptCore = userAgentsOf(
          "undefined is not an object (evaluating 'window.webkit.messageHandlers')"
        );
        const extension = userAgentsOf("Cannot read properties of null (reading 'type')");

        // Safari words it this way, and Chrome and Firefox have their own wording
        expect(javaScriptCore.length).toBeGreaterThan(0);
        javaScriptCore.forEach((userAgent) => expect(userAgent).not.toMatch(/Chrome\/|Firefox\//));
        // The frames are of a `chrome-extension://` script
        expect(extension.length).toBeGreaterThan(0);
        extension.forEach((userAgent) => expect(userAgent).toContain('Chrome/'));
      });

      it('has errors with no type, with no stack trace and with an empty one', () => {
        const exceptions = eventsOf(withEdgeCases, 'exception');

        expect(exceptions.some((doc) => attribute(doc, 'exception.type') === undefined)).toBe(true);
        expect(exceptions.some((doc) => attribute(doc, 'exception.stacktrace') === undefined)).toBe(
          true
        );
        expect(exceptions.some((doc) => attribute(doc, 'exception.stacktrace') === '')).toBe(true);
      });

      it('has more than 100 distinct stack traces for one app', () => {
        const stacks = (
          DIGITAL_EXPERIENCE_EDGE_CASES['support-center-web'].exceptions ?? []
        ).flatMap(({ stacks: exceptionStacks = [] }) => exceptionStacks);

        expect(new Set(stacks.map((stack) => JSON.stringify(stack))).size).toBeGreaterThan(100);
      });

      it('has browsers that are not identified, and clicks without a selector', () => {
        expect(
          withEdgeCases.some((doc) => doc.resource?.attributes?.['browser.name'] === undefined)
        ).toBe(true);
        expect(
          eventsOf(withEdgeCases, 'browser.user_action.click').some(
            (doc) => attribute(doc, 'browser.css_selector') === undefined
          )
        ).toBe(true);
      });

      it('has the pages of a list as pages of their own', () => {
        const pages = new Set(
          withEdgeCases
            .map((doc) => String(attribute(doc, 'url.full')))
            .filter((url) => url.includes('example-store.com/products?page='))
        );

        expect(pages.size).toBeGreaterThan(2);
      });

      it('draws the same sessions with edge cases as without', () => {
        const sessionsOf = (all: EdotBrowserDocument[]) =>
          new Set(
            appDocs(all, 'docs-web')
              .map((doc) => attribute(doc, 'session.id'))
              .filter(Boolean)
          );

        // docs-web only brings a search index and browsers that aren't identified
        expect(sessionsOf(withEdgeCases)).toEqual(sessionsOf(docs));
      });
    });

    describe('network', () => {
      it('has more resources than a page of the table in the busiest apps', () => {
        ['storefront-web', 'checkout-web', 'media-portal-web'].forEach((serviceName) => {
          expect(pageLoadResourceUrls(appDocs(docs, serviceName)).size).toBeGreaterThan(10);
        });
      });

      it('has hashed chunk names and a long CDN URL with a query string', () => {
        const urls = [...pageLoadResourceUrls(appDocs(docs, 'storefront-web')).keys()].map(String);

        expect(urls.some((url) => /\/chunk-[a-z-]+\.[0-9a-f]{6}\.js$/.test(url))).toBe(true);
        expect(urls.some((url) => url.length > 150 && url.includes('?'))).toBe(true);
      });

      it('loads some resources on some page loads only', () => {
        const counts = pageLoadResourceUrls(appDocs(docs, 'storefront-web'));
        const main = counts.get('https://www.example-store.com/assets/js/main.3f9a1c.js') ?? 0;
        const lazy =
          counts.get('https://www.example-store.com/assets/js/chunk-zoom.e6d3c8.js') ?? 0;

        expect(lazy).toBeGreaterThan(0);
        expect(lazy).toBeLessThan(main / 2);
      });

      it('has an endpoint whose slowest requests are far slower than the median', () => {
        const durations = requests(appDocs(docs, 'storefront-web'))
          .filter(
            (span) =>
              span.attributes['url.full'] === 'https://www.example-store.com/api/recommendations'
          )
          .map((span) => Number(span.duration))
          .sort((a, b) => a - b);

        expect(durations.length).toBeGreaterThan(100);
        expect(durations[Math.floor(durations.length * 0.95)]).toBeGreaterThan(
          durations[Math.floor(durations.length * 0.5)] * 5
        );
      });

      it('has one URL per order for the orders of the storefront, some of them not found', () => {
        const orders = requests(appDocs(docs, 'storefront-web')).filter((span) =>
          String(span.attributes['url.full']).includes('/api/orders/')
        );
        const urls = new Set(orders.map((span) => span.attributes['url.full']));

        expect(urls.size).toBeGreaterThanOrEqual(3);
        urls.forEach((url) => expect(url).not.toContain('{id}'));
        expect(orders.some((span) => span.attributes['http.response.status_code'] === 404)).toBe(
          true
        );
      });

      it('has an endpoint that answers 404 in another app than the checkout', () => {
        const statuses = count(
          requests(appDocs(docs, 'media-portal-web'))
            .filter((span) => String(span.attributes['url.full']).endsWith('/api/user/preferences'))
            .map((span) => span.attributes['http.response.status_code'])
        );

        expect(statuses.get(404)).toBeGreaterThan(5);
        expect(statuses.get(200)).toBeGreaterThan(statuses.get(404) ?? 0);
      });
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
