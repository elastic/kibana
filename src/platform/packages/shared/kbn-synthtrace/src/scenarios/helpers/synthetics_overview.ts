/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom, syntheticsMonitor } from '@kbn/synthtrace-client';
import type {
  SyntheticsMonitorConfig,
  SyntheticsMonitorConfigType,
} from '../../lib/synthetics/synthetics_monitors_api';
import { getMonitorConfigId } from '../../lib/synthetics/synthetics_monitors_api';
import { getBooleanOpt, getNumberOpt, getStringOpt } from './scenario_opts_helpers';
import type { CheckOutcome, OutcomePattern } from './synthetics_check_outcomes';
import {
  getCheckDurationUs,
  getCheckOutcomes,
  nextCheckOutcome,
} from './synthetics_check_outcomes';

export const SYNTHETICS_OVERVIEW_TAG = 'synthtrace-synthetics_overview';

const DEFAULT_MONITORS = 8;
const DEFAULT_SEED = 'synthtrace';
const DEFAULT_SPACE_ID = 'default';

const MONITOR_TYPES: SyntheticsMonitorConfigType[] = ['http', 'tcp', 'icmp', 'browser'];

const SCHEDULE_MINUTES: Record<SyntheticsMonitorConfigType, number> = {
  http: 3,
  tcp: 3,
  icmp: 5,
  browser: 10,
};

const PATTERN_CYCLE: OutcomePattern[] = [
  { type: 'healthy' },
  { type: 'healthy' },
  { type: 'flapping' },
  { type: 'healthy' },
  { type: 'down' },
  { type: 'healthy' },
  { type: 'outage', downChecks: 3 },
];

const ERROR_MESSAGES: Record<Exclude<SyntheticsMonitorConfigType, 'browser'>, string> = {
  http: 'received status code 503',
  tcp: 'connection refused',
  icmp: 'request timeout',
};

const HTTP_HEADERS_UP = { 'Content-Type': 'application/json', Server: 'nginx' };
const HTTP_HEADERS_DOWN = { 'Content-Type': 'text/html', Server: 'nginx', 'Retry-After': '120' };
const HTTP_DOWN_BODY =
  '<html><head><title>503 Service Unavailable</title></head>' +
  '<body><h1>Service Unavailable</h1><p>The server is temporarily unable to handle the request.</p></body></html>';

const BROWSER_STEP_ERROR = 'locator.click: Timeout 30000ms exceeded';

export interface PrivateLocation {
  id: string;
  label: string;
}

export interface SyntheticsOverviewOpts {
  /** Undefined when the options do not name one: the scenario then looks for it in Kibana. */
  privateLocation?: PrivateLocation;
  monitors: number;
  seed: string;
  spaceId: string;
  deleteMonitorsOnExit: boolean;
}

export const parseSyntheticsOverviewOpts = (
  scenarioOpts: Record<string, unknown> | undefined
): SyntheticsOverviewOpts => {
  const id = getStringOpt(scenarioOpts, 'privateLocationId');
  const label = getStringOpt(scenarioOpts, 'privateLocationLabel');
  if (Boolean(id) !== Boolean(label)) {
    throw new Error(
      'synthetics_overview needs both --scenarioOpts.privateLocationId and ' +
        '--scenarioOpts.privateLocationLabel, or neither: without them, it uses the only private ' +
        'location of the Kibana space.'
    );
  }

  const monitors = getNumberOpt(scenarioOpts, 'monitors', DEFAULT_MONITORS);
  if (!Number.isInteger(monitors) || monitors < 1) {
    throw new Error('monitors must be a positive integer');
  }

  return {
    privateLocation: id && label ? { id, label } : undefined,
    monitors,
    seed: getStringOpt(scenarioOpts, 'seed') ?? DEFAULT_SEED,
    spaceId: getStringOpt(scenarioOpts, 'spaceId') ?? DEFAULT_SPACE_ID,
    deleteMonitorsOnExit: getBooleanOpt(scenarioOpts, 'deleteMonitorsOnExit', false),
  };
};

export interface OverviewMonitor {
  config: SyntheticsMonitorConfig;
  pattern: OutcomePattern;
}

const getTarget = (type: SyntheticsMonitorConfigType, number: number): string | undefined => {
  switch (type) {
    case 'http':
      return `https://service-${number}.example.com/health`;
    case 'tcp':
      return `db-${number}.example.com:5432`;
    case 'icmp':
      return `gw-${number}.example.com`;
    case 'browser':
      return undefined;
  }
};

/**
 * The monitors of the scenario: types, patterns and ids are a function of their position.
 * The id includes the space. Monitor saved objects are multi-namespace, so an id is unique
 * across every space, and the same id in a second space cannot be created.
 */
export const getOverviewMonitors = ({
  monitors,
  privateLocation,
  spaceId,
}: {
  monitors: number;
  privateLocation: PrivateLocation;
  spaceId: string;
}): OverviewMonitor[] =>
  Array.from({ length: monitors }, (_, index) => {
    const type = MONITOR_TYPES[index % MONITOR_TYPES.length];
    const number = index + 1;

    return {
      pattern: PATTERN_CYCLE[index % PATTERN_CYCLE.length],
      config: {
        id: getMonitorConfigId(`${SYNTHETICS_OVERVIEW_TAG}:${spaceId}:${number}`),
        type,
        name: `Synthtrace ${type.toUpperCase()} ${number}`,
        target: getTarget(type, number),
        scheduleMinutes: SCHEDULE_MINUTES[type],
        tags: [type],
        privateLocations: [privateLocation.id],
      },
    };
  });

/** Numbers the runs of identical consecutive outcomes, so each up or down streak has an index. */
export const getStreakIndexes = (outcomes: CheckOutcome[]): number[] => {
  let streak = 0;

  return outcomes.map((outcome, index) => {
    if (index > 0 && outcome !== outcomes[index - 1]) {
      streak++;
    }
    return streak;
  });
};

/**
 * Returns the timestamp of the check that a range has to generate for its `index`-th timestamp,
 * or undefined if none is due.
 *
 * The checks of a monitor are on one schedule for the whole run: `from` plus a multiple of the
 * schedule interval. A range generates the schedule points that fall inside it, whatever its
 * size, and does not use the timestamps it is given, which start at the start of the range.
 * Historical runs split the run into one range per worker, and live runs generate 1 s ranges.
 * Using those timestamps would put checks off the schedule at the start of every range, and
 * would generate a check per range instead of one per schedule interval.
 *
 * A range of a given length yields at least as many timestamps as it has schedule points, so
 * the index of a timestamp is enough to find the schedule point it stands for.
 */
export const getCheckTimestamp = ({
  index,
  rangeFrom,
  rangeTo,
  from,
  scheduleMinutes,
}: {
  index: number;
  rangeFrom: number;
  rangeTo: number;
  from: number;
  scheduleMinutes: number;
}): number | undefined => {
  const intervalMs = scheduleMinutes * 60 * 1000;
  const firstPointIndex = Math.max(0, Math.ceil((rangeFrom - from) / intervalMs));
  const timestamp = from + (firstPointIndex + index) * intervalMs;

  return timestamp < rangeTo ? timestamp : undefined;
};

/**
 * Decides the outcome of the check at a timestamp. The outcomes are laid out over the whole
 * run range, not the range of the worker that asks, so every worker agrees on them. A live run
 * goes on after `to`: later checks are appended, and the checks already laid out stay as they
 * are. Laying an outage out again for a longer count would move its down window forward.
 */
export const createCheckTimeline = ({
  pattern,
  scheduleMinutes,
  monitorId,
  seed,
  from,
  to,
}: {
  pattern: OutcomePattern;
  scheduleMinutes: number;
  monitorId: string;
  seed: string;
  from: number;
  to: number;
}) => {
  const intervalMs = scheduleMinutes * 60 * 1000;
  const random = createSeededRandom(`${seed}:${monitorId}`);
  const outcomes = getCheckOutcomes({
    pattern,
    count: Math.max(1, Math.ceil((to - from) / intervalMs)),
    random,
  });
  const streaks = getStreakIndexes(outcomes);

  const extendThrough = (index: number) => {
    while (outcomes.length <= index) {
      const last = outcomes[outcomes.length - 1];
      const next = nextCheckOutcome(pattern, outcomes, random);
      streaks.push(next === last ? streaks[streaks.length - 1] : streaks[streaks.length - 1] + 1);
      outcomes.push(next);
    }
  };

  return (
    timestamp: number
  ): { index: number; outcome: CheckOutcome; streak: number; streakStartedAt: number } => {
    const index = Math.max(Math.floor((timestamp - from) / intervalMs), 0);
    if (index >= outcomes.length) {
      extendThrough(index);
    }
    const streak = streaks[index];
    // Streak numbers only increase, so the first check with this number is where it started.
    const streakStartIndex = streaks.indexOf(streak);

    return {
      index,
      outcome: outcomes[index],
      streak,
      streakStartedAt: from + streakStartIndex * intervalMs,
    };
  };
};

/** The documents of one check of a monitor: one for http, tcp and icmp, a whole run for browser. */
export const buildCheck = ({
  config,
  location,
  spaceId,
  timestamp,
  outcome,
  streakStartedAt,
  random,
}: {
  config: SyntheticsMonitorConfig;
  location: PrivateLocation;
  spaceId: string;
  timestamp: number;
  outcome: CheckOutcome;
  /** Timestamp of the first check of this up or down streak. */
  streakStartedAt: number;
  random: () => number;
}): Array<ReturnType<typeof syntheticsMonitor.create>> => {
  const { id, type, name, target, scheduleMinutes, tags = [] } = config;
  // The streak number restarts at zero on every run, so two backfills would share it.
  // The start time does not: it is the same for every worker of one run.
  const stateFields = {
    'state.id': `${id}-${location.id}-${streakStartedAt}`,
    'state.started_at': new Date(streakStartedAt).toISOString(),
    'state.duration_ms': timestamp - streakStartedAt,
  };
  const checkGroup = `${id}-${timestamp}`;
  const isUp = outcome === 'up';

  const monitor = syntheticsMonitor
    .create()
    .dataset(type)
    .name(name)
    .origin('ui')
    .configId(id)
    .spaceId(spaceId)
    .tags([SYNTHETICS_OVERVIEW_TAG, ...tags])
    .interval(scheduleMinutes * 60)
    .location(location)
    .timestamp(timestamp)
    .overrides({
      'monitor.id': id,
      'monitor.check_group': checkGroup,
      'monitor.fleet_managed': true,
      'monitor.timespan.gte': new Date(timestamp).toISOString(),
      'monitor.timespan.lt': new Date(timestamp + scheduleMinutes * 60 * 1000).toISOString(),
      'agent.type': 'heartbeat',
    });

  if (type === 'browser') {
    const steps = [
      { name: 'Open the home page', durationUs: getCheckDurationUs('up', random) },
      {
        name: 'Submit the form',
        durationUs: getCheckDurationUs(outcome, random),
        ...(isUp ? {} : { error: BROWSER_STEP_ERROR }),
      },
    ];
    const documents = monitor.journey({
      id: 'journey',
      name,
      checkGroup,
      steps,
    });
    documents[documents.length - 1].overrides(stateFields);

    return documents;
  }

  if (target) {
    monitor.url(target);
  }
  monitor.duration(getCheckDurationUs(outcome, random));
  if (type === 'http') {
    monitor.httpResponse(
      isUp
        ? { statusCode: 200, headers: HTTP_HEADERS_UP }
        : { statusCode: 503, headers: HTTP_HEADERS_DOWN, body: HTTP_DOWN_BODY }
    );
  }
  if (isUp) {
    monitor.up();
  } else {
    monitor.down().error({ message: ERROR_MESSAGES[type], type: 'io' });
  }
  monitor.overrides(stateFields);

  return [monitor];
};
