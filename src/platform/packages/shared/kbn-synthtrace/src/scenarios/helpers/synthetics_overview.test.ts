/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom } from '@kbn/synthtrace-client';
import {
  SYNTHETICS_OVERVIEW_TAG,
  buildCheck,
  createCheckTimeline,
  getCheckTimestamp,
  getOverviewMonitors,
  getStreakIndexes,
  parseSyntheticsOverviewOpts,
} from './synthetics_overview';

const LOCATION = { id: 'location-id', label: 'Location label' };
const MINUTE = 60 * 1000;
const FROM = new Date('2026-01-01T00:00:00.000Z').getTime();
const toMs = (minutes: number) => FROM + minutes * MINUTE;

describe('parseSyntheticsOverviewOpts', () => {
  const required = { privateLocationId: 'location-id', privateLocationLabel: 'Location label' };

  it('leaves the private location out when the options do not name one', () => {
    expect(parseSyntheticsOverviewOpts(undefined).privateLocation).toBeUndefined();
    expect(parseSyntheticsOverviewOpts({}).privateLocation).toBeUndefined();
  });

  it('needs both the private location id and label, or neither', () => {
    expect(() => parseSyntheticsOverviewOpts({ privateLocationId: 'id' })).toThrow(
      'both --scenarioOpts.privateLocationId and --scenarioOpts.privateLocationLabel'
    );
    expect(() => parseSyntheticsOverviewOpts({ privateLocationLabel: 'label' })).toThrow(
      'both --scenarioOpts.privateLocationId and --scenarioOpts.privateLocationLabel'
    );
  });

  it('applies the defaults', () => {
    expect(parseSyntheticsOverviewOpts(required)).toEqual({
      privateLocation: LOCATION,
      monitors: 8,
      seed: 'synthtrace',
      spaceId: 'default',
      deleteMonitorsOnExit: false,
    });
  });

  it('reads the options, accepting the strings that the CLI produces', () => {
    expect(
      parseSyntheticsOverviewOpts({
        ...required,
        monitors: '4',
        seed: 'abc',
        spaceId: 'team-a',
        deleteMonitorsOnExit: 'true',
      })
    ).toMatchObject({ monitors: 4, seed: 'abc', spaceId: 'team-a', deleteMonitorsOnExit: true });
  });

  it('rejects an invalid number of monitors', () => {
    expect(() => parseSyntheticsOverviewOpts({ ...required, monitors: 0 })).toThrow(
      'monitors must be a positive integer'
    );
    expect(() => parseSyntheticsOverviewOpts({ ...required, monitors: 1.5 })).toThrow(
      'monitors must be a positive integer'
    );
  });
});

describe('getOverviewMonitors', () => {
  const monitors = getOverviewMonitors({
    monitors: 8,
    privateLocation: LOCATION,
    spaceId: 'default',
  });

  it('creates the requested number of monitors with distinct UUID ids', () => {
    const ids = monitors.map(({ config }) => config.id);

    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it('is stable between calls', () => {
    expect(
      getOverviewMonitors({ monitors: 8, privateLocation: LOCATION, spaceId: 'default' })
    ).toEqual(monitors);
  });

  it('gives each space its own monitor ids', () => {
    const inTeam = getOverviewMonitors({
      monitors: 8,
      privateLocation: LOCATION,
      spaceId: 'team-a',
    });

    expect(inTeam.map(({ config }) => config.id)).not.toEqual(
      monitors.map(({ config }) => config.id)
    );
  });

  it('cycles through the monitor types with a schedule and target per type', () => {
    expect(
      monitors.slice(0, 4).map(({ config }) => [config.type, config.scheduleMinutes, config.target])
    ).toEqual([
      ['http', 3, 'https://service-1.example.com/health'],
      ['tcp', 3, 'db-2.example.com:5432'],
      ['icmp', 5, 'gw-3.example.com'],
      ['browser', 10, undefined],
    ]);
    expect(monitors[4].config.type).toBe('http');
  });

  it('names the monitors after their type and position, and puts them on the private location', () => {
    expect(monitors[0].config.name).toBe('Synthtrace HTTP 1');
    expect(monitors[3].config.name).toBe('Synthtrace BROWSER 4');
    for (const { config } of monitors) {
      expect(config.privateLocations).toEqual([LOCATION.id]);
    }
  });

  it('mixes healthy, flapping, down and outage patterns', () => {
    expect(new Set(monitors.map(({ pattern }) => pattern.type))).toEqual(
      new Set(['healthy', 'flapping', 'down', 'outage'])
    );
  });
});

describe('getStreakIndexes', () => {
  it('numbers each run of identical outcomes', () => {
    expect(getStreakIndexes(['up', 'up', 'down', 'down', 'down', 'up'])).toEqual([
      0, 0, 1, 1, 1, 2,
    ]);
    expect(getStreakIndexes([])).toEqual([]);
  });
});

describe('createCheckTimeline', () => {
  const timeline = (to: number) =>
    createCheckTimeline({
      pattern: { type: 'outage', downChecks: 3 },
      scheduleMinutes: 3,
      monitorId: 'monitor-1',
      seed: 'seed',
      from: FROM,
      to,
    });

  it('lays the pattern out over the whole run range', () => {
    // 60 minutes at a 3 minute schedule are 20 checks, the last 3 of them are down.
    const getCheck = timeline(FROM + 60 * MINUTE);

    expect(getCheck(FROM).outcome).toBe('up');
    expect(getCheck(FROM + 16 * 3 * MINUTE).outcome).toBe('up');
    expect(getCheck(FROM + 17 * 3 * MINUTE).outcome).toBe('down');
    expect(getCheck(FROM + 19 * 3 * MINUTE).outcome).toBe('down');
  });

  it('returns the check index and the streak of the outcome', () => {
    const getCheck = timeline(FROM + 60 * MINUTE);

    expect(getCheck(FROM + 3 * 3 * MINUTE)).toEqual({
      index: 3,
      outcome: 'up',
      streak: 0,
      streakStartedAt: FROM,
    });
    expect(getCheck(FROM + 18 * 3 * MINUTE)).toEqual({
      index: 18,
      outcome: 'down',
      streak: 1,
      streakStartedAt: FROM + 17 * 3 * MINUTE,
    });
  });

  it('clamps timestamps before the range to the first check', () => {
    expect(timeline(FROM + 60 * MINUTE)(FROM - 10 * MINUTE).index).toBe(0);
  });

  it('goes on after the range, as a live run does, instead of repeating the last check', () => {
    const getCheck = timeline(FROM + 60 * MINUTE);

    expect(getCheck(FROM + 30 * 3 * MINUTE).index).toBe(30);
    expect(getCheck(FROM + 31 * 3 * MINUTE).index).toBe(31);
  });

  it('keeps an outage streak continuous when the run goes on past the range', () => {
    const getCheck = timeline(FROM + 60 * MINUTE);
    const outageStart = FROM + 17 * 3 * MINUTE;
    const beforeOutage = getCheck(FROM + 16 * 3 * MINUTE);
    const firstDown = getCheck(outageStart);
    const lastInRange = getCheck(FROM + 19 * 3 * MINUTE);

    const later = getCheck(FROM + 30 * 3 * MINUTE);

    expect(beforeOutage.outcome).toBe('up');
    expect(firstDown).toMatchObject({ outcome: 'down', streak: 1, streakStartedAt: outageStart });
    expect(later).toMatchObject({
      outcome: 'down',
      streak: 1,
      streakStartedAt: outageStart,
    });
    expect(later.streakStartedAt).toBe(firstDown.streakStartedAt);
    // Extending the run does not rewrite the checks already laid out.
    expect(getCheck(outageStart)).toEqual(firstDown);
    expect(getCheck(FROM + 19 * 3 * MINUTE)).toEqual(lastInRange);
    expect(getCheck(FROM + 16 * 3 * MINUTE)).toEqual(beforeOutage);
  });

  it('keeps the checks already laid out when a flapping run goes on past the range', () => {
    const getCheck = createCheckTimeline({
      pattern: { type: 'flapping' },
      scheduleMinutes: 3,
      monitorId: 'monitor-1',
      seed: 'seed',
      from: FROM,
      to: FROM + 30 * MINUTE,
    });
    const laidOut = Array.from({ length: 10 }, (_, index) => getCheck(FROM + index * 3 * MINUTE));

    getCheck(FROM + 60 * 3 * MINUTE);

    expect(
      Array.from({ length: 10 }, (_, index) => getCheck(FROM + index * 3 * MINUTE))
    ).toEqual(laidOut);
  });

  it('keeps the outcomes of a flapping monitor varying after the range', () => {
    const getCheck = createCheckTimeline({
      pattern: { type: 'flapping' },
      scheduleMinutes: 3,
      monitorId: 'monitor-1',
      seed: 'seed',
      from: FROM,
      to: FROM + MINUTE,
    });
    const outcomes = Array.from({ length: 60 }, (_, i) => getCheck(FROM + i * 3 * MINUTE).outcome);

    expect(new Set(outcomes)).toEqual(new Set(['up', 'down']));
  });

  it('is reproducible for the same seed', () => {
    const flapping = () =>
      createCheckTimeline({
        pattern: { type: 'flapping' },
        scheduleMinutes: 3,
        monitorId: 'monitor-1',
        seed: 'seed',
        from: FROM,
        to: FROM + 600 * MINUTE,
      });

    expect(flapping()(FROM + 90 * MINUTE)).toEqual(flapping()(FROM + 90 * MINUTE));
  });
});

describe('getCheckTimestamp', () => {
  const SCHEDULE = 3;
  const INTERVAL = SCHEDULE * MINUTE;

  /**
   * The checks that a range generates: a range gets one timestamp per schedule interval, from
   * its start, as `range.interval()` does, and each gets the schedule point of its position.
   */
  const checksOfRange = (rangeFrom: number, rangeTo: number): number[] => {
    const timestamps = Math.ceil((rangeTo - rangeFrom) / INTERVAL);

    return Array.from({ length: timestamps }, (_, index) =>
      getCheckTimestamp({
        index,
        rangeFrom,
        rangeTo,
        from: FROM,
        scheduleMinutes: SCHEDULE,
      })
    ).filter((timestamp): timestamp is number => timestamp !== undefined);
  };

  const schedulePoints = (count: number) =>
    Array.from({ length: count }, (_, index) => FROM + index * INTERVAL);

  it('generates the schedule points of a range that starts on the schedule', () => {
    expect(checksOfRange(FROM, FROM + 12 * MINUTE)).toEqual(schedulePoints(4));
  });

  it('generates the schedule points of a range that does not start on the schedule', () => {
    // The range starts 1 minute after a schedule point: its first check is the next one.
    expect(checksOfRange(FROM + 4 * MINUTE, FROM + 13 * MINUTE)).toEqual([6, 9, 12].map(toMs));
  });

  it('puts no check off the schedule or twice, however the run is split between workers', () => {
    const to = FROM + 24 * 60 * MINUTE;

    for (const workers of [1, 2, 3, 7, 9, 10, 11]) {
      const span = (to - FROM) / workers;
      const checks = Array.from({ length: workers }, (_, worker) =>
        checksOfRange(Math.round(FROM + worker * span), Math.round(FROM + (worker + 1) * span))
      ).flat();

      expect(checks).toEqual(schedulePoints(480));
    }
  });

  it('generates one check per schedule interval from 1 s live buckets', () => {
    const checks: number[] = [];

    for (let start = FROM; start < FROM + 10 * MINUTE; start += 1000) {
      checks.push(...checksOfRange(start, start + 1000));
    }

    expect(checks).toEqual(schedulePoints(4));
  });

  it('finds the schedule point inside a longer live bucket, after a delay', () => {
    expect(checksOfRange(FROM + 2 * MINUTE + 50_000, FROM + 3 * MINUTE + 10_000)).toEqual([
      FROM + 3 * MINUTE,
    ]);
    expect(checksOfRange(FROM + 3 * MINUTE + 1000, FROM + 3 * MINUTE + 6000)).toEqual([]);
  });
});

describe('buildCheck', () => {
  const [httpMonitor, tcpMonitor, , browserMonitor] = getOverviewMonitors({
    monitors: 4,
    privateLocation: LOCATION,
    spaceId: 'default',
  });
  const timestamp = FROM + 5 * MINUTE;

  const check = (
    monitor: typeof httpMonitor,
    outcome: 'up' | 'down',
    spaceId = 'default',
    streakStartedAt = timestamp
  ) =>
    buildCheck({
      config: monitor.config,
      location: LOCATION,
      spaceId,
      timestamp,
      outcome,
      streakStartedAt,
      random: createSeededRandom('random'),
    }).flatMap((monitorDocument) => monitorDocument.serialize());

  it('builds one document for an http check, with the fields the Synthetics UI reads', () => {
    const documents = check(httpMonitor, 'up', 'team-a');

    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      '@timestamp': timestamp,
      'data_stream.dataset': 'http',
      'data_stream.type': 'synthetics',
      'monitor.type': 'http',
      'monitor.id': httpMonitor.config.id,
      'monitor.name': 'Synthtrace HTTP 1',
      'monitor.status': 'up',
      'monitor.origin': 'ui',
      'monitor.interval': 180,
      'monitor.check_group': `${httpMonitor.config.id}-${timestamp}`,
      config_id: httpMonitor.config.id,
      'meta.space_id': 'team-a',
      'observer.name': LOCATION.id,
      'observer.geo.name': LOCATION.label,
      'url.full': 'https://service-1.example.com/health',
      'url.domain': 'service-1.example.com',
      tags: [SYNTHETICS_OVERVIEW_TAG, 'http'],
      'summary.up': 1,
      'summary.down': 0,
      'state.status': 'up',
      'state.id': `${httpMonitor.config.id}-${LOCATION.id}-${timestamp}`,
      'state.started_at': new Date(timestamp).toISOString(),
      'state.duration_ms': 0,
    });
    expect(documents[0]).not.toHaveProperty(['error.message']);
  });

  it('records the response of an http check: status code, headers and, when down, the body', () => {
    const [up] = check(httpMonitor, 'up');
    const [down] = check(httpMonitor, 'down');

    expect(up).toMatchObject({
      'http.response.status_code': 200,
      'http.response.headers.Content-Type': 'application/json',
    });
    expect(up).not.toHaveProperty(['http.response.body.content']);
    expect(down).toMatchObject({
      'http.response.status_code': 503,
      'http.response.headers.Retry-After': '120',
      'http.response.body.content': expect.stringContaining('503 Service Unavailable'),
    });
    const fields = down as unknown as Record<string, unknown>;
    expect(fields['http.response.body.bytes']).toBeGreaterThan(0);
    expect(fields['http.response.body.bytes']).toBe(fields['http.response.body.content_bytes']);
  });

  it('does not record an http response for tcp checks', () => {
    const [document] = check(tcpMonitor, 'up');

    expect(document).not.toHaveProperty(['http.response.status_code']);
  });

  it('sets the span of the check from its schedule', () => {
    const [document] = check(httpMonitor, 'up');

    expect(document['monitor.timespan.gte']).toBe(new Date(timestamp).toISOString());
    expect(document['monitor.timespan.lt']).toBe(new Date(timestamp + 3 * MINUTE).toISOString());
  });

  it('builds a down check with an error and a long duration', () => {
    const [document] = check(tcpMonitor, 'down');

    expect(document).toMatchObject({
      'monitor.status': 'down',
      'summary.down': 1,
      'state.status': 'down',
      'error.message': 'connection refused',
      'error.type': 'io',
      'url.full': 'db-2.example.com:5432',
    });
    expect(document['monitor.duration.us']).toBeGreaterThanOrEqual(5_000_000);
  });

  it('keeps the start and the elapsed time of a streak that began before this check', () => {
    const startedAt = timestamp - 15 * MINUTE;
    const [http] = check(httpMonitor, 'down', 'default', startedAt);
    const browser = check(browserMonitor, 'down', 'default', startedAt);
    const summary = browser[browser.length - 1];

    expect(http).toMatchObject({
      'state.started_at': new Date(startedAt).toISOString(),
      'state.duration_ms': 15 * MINUTE,
    });
    expect(summary).toMatchObject({
      'synthetics.type': 'heartbeat/summary',
      'state.started_at': new Date(startedAt).toISOString(),
      'state.duration_ms': 15 * MINUTE,
    });
  });

  it('gives each streak its own state id from its start, not from its number in the run', () => {
    const startedAt = timestamp - 15 * MINUTE;
    const [first] = check(httpMonitor, 'down', 'default', startedAt);
    const [sameStreak] = check(httpMonitor, 'down', 'default', startedAt);
    const [otherStreak] = check(httpMonitor, 'up', 'default', startedAt - 3 * MINUTE);

    expect(first['state.id']).toBe(`${httpMonitor.config.id}-${LOCATION.id}-${startedAt}`);
    expect(sameStreak['state.id']).toBe(first['state.id']);
    expect(otherStreak['state.id']).not.toBe(first['state.id']);
  });

  it('builds a whole journey run for a browser check', () => {
    const documents = check(browserMonitor, 'up');

    expect(documents.map((document) => document['synthetics.type'])).toEqual([
      'journey/start',
      'step/end',
      'step/end',
      'heartbeat/summary',
    ]);
    expect(documents[documents.length - 1]).toMatchObject({
      'data_stream.dataset': 'browser',
      'monitor.status': 'up',
      'monitor.type': 'browser',
      'state.id': `${browserMonitor.config.id}-${LOCATION.id}-${timestamp}`,
    });
  });

  it('fails the second step of a down browser check', () => {
    const documents = check(browserMonitor, 'down');

    expect(documents.map((document) => document['synthetics.step.status'])).toEqual([
      undefined,
      'succeeded',
      'failed',
      undefined,
    ]);
    expect(documents[documents.length - 1]).toMatchObject({
      'monitor.status': 'down',
      'error.message': 'locator.click: Timeout 30000ms exceeded',
    });
  });

  it('builds the same documents for the same random source', () => {
    expect(check(httpMonitor, 'up')).toEqual(check(httpMonitor, 'up'));
  });
});
