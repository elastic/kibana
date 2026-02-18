/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { parseInterval } from '@kbn/synthtrace-client';
import moment from 'moment';
import type { Scenario } from '../../cli/scenario';
import type {
  ServiceGraph,
  ServiceNamesOf,
  ServiceDependenciesOf,
} from '../../lib/sigevents/types';
import type {
  ChannelVolume,
  FailuresOrFn,
  NoiseConfig,
} from '../../lib/sigevents/build_logs_generator';
import { sigEvents } from '../../lib/sigevents';
import { withClient } from '../../lib/utils/with_client';
/** Parsed `--scenarioOpts` keys for sigevents scenarios. */
interface ScenarioOpts {
  seed?: string;
  baselineMinutes?: string;
  mockApp?: string;
  scenario?: string;
  baseRate?: string;
}

export function parseOpts(raw: Record<string, unknown> | undefined): {
  seed: number;
  baselineMinutes: number;
  mockApp: string;
  scenario: string | undefined;
  baseRate: number;
} {
  const opts = (raw ?? {}) as ScenarioOpts;
  return {
    seed: opts.seed ? parseInt(opts.seed, 10) : Math.floor(Math.random() * 100000),
    baselineMinutes: opts.baselineMinutes ? parseFloat(opts.baselineMinutes) : 0,
    mockApp: opts.mockApp ?? 'default',
    scenario: opts.scenario,
    baseRate: opts.baseRate ? parseInt(opts.baseRate, 10) : 1,
  };
}

/**
 * Converts a human-readable duration string to milliseconds.
 * Delegates parsing to `parseInterval` (same format as synthtrace `interval`: `30s`, `5m`, `1h`, `2d`).
 * @example ms('5m') // 300_000 ; ms('30s') // 30_000 ; ms('1h') // 3_600_000
 */
export const duration = (s: string): number => {
  const { intervalAmount, intervalUnit } = parseInterval(s);
  return moment.duration(intervalAmount, intervalUnit).asMilliseconds();
};

/**
 * Returns `(offsetMin) => absoluteTimestamp` anchored to the incident start.
 * @example const at = incidentAt(from, baselineWindowMs); at(-5) // pre-incident; at(0) // start; at(20) // recovery
 */
export const incidentAt =
  (from: number, baselineWindowMs: number) =>
  (offsetMin: number): number =>
    from + baselineWindowMs + offsetMin * 60 * 1_000;

/** Return value of `ScenarioDefinition.build`; drives log generation for one scenario run. */
export interface ScenarioBuildResult<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** Override the service graph; defaults to the mock app's graph. */
  serviceGraph?: TServiceGraph;
  /** Override the entry service; defaults to the mock app's `entryService`. */
  entryService?: ServiceNamesOf<TServiceGraph>;
  failures?: FailuresOrFn<ServiceNamesOf<TServiceGraph>, ServiceDependenciesOf<TServiceGraph>>;
  volume?: ChannelVolume<ServiceNamesOf<TServiceGraph> | ServiceDependenciesOf<TServiceGraph>>;
  noise?: NoiseConfig;
}

/** A named failure scenario with metadata and a `build` factory. */
export interface ScenarioDefinition<TServiceGraph extends ServiceGraph = ServiceGraph> {
  name: string;
  description: string;
  build(ctx: { at: (offsetMin: number) => number }): ScenarioBuildResult<TServiceGraph>;
}

/** Bundles a service topology, entry service, and failure scenario registry for a mock application. */
export interface MockAppDefinition<TServiceGraph extends ServiceGraph = ServiceGraph> {
  name: string;
  description: string;
  serviceGraph: TServiceGraph;
  entryService: ServiceNamesOf<TServiceGraph>;
  scenarios: Record<string, ScenarioDefinition<TServiceGraph>>;
}

/** Identity helper; exists solely for TypeScript inference on `MockAppDefinition`. */
export const defineMockApp = <TServiceGraph extends ServiceGraph>(
  def: MockAppDefinition<TServiceGraph>
): MockAppDefinition<TServiceGraph> => def;

/**
 * Builds a synthtrace `Scenario` from a map of `MockAppDefinition` objects.
 * Select an app at runtime with `--scenarioOpts mockApp=<id>` (default: `"default"`).
 *
 * @example
 * export default createSigEventsScenario({ default: CLAIMS_APP, ecommerce: ECOMMERCE_APP });
 */
export function createSigEventsScenario<TServiceGraph extends ServiceGraph>(
  mockApps: Record<string, MockAppDefinition<TServiceGraph>>,
  opts?: { baseRate?: number }
): Scenario<LogDocument> {
  return async (runOptions) => {
    const {
      seed,
      mockApp: mockAppId,
      scenario: scenarioId,
      baselineMinutes,
      baseRate: parsedBaseRate,
    } = parseOpts(runOptions.scenarioOpts);

    if (!mockApps[mockAppId]) {
      throw new Error(
        `Unknown mockApp: "${mockAppId}". Available: ${Object.keys(mockApps).join(', ')}`
      );
    }

    const mockApp = mockApps[mockAppId];

    if (scenarioId && !mockApp.scenarios[scenarioId]) {
      throw new Error(
        `Unknown scenario: "${scenarioId}" for mockApp "${mockAppId}". Available: ${Object.keys(
          mockApp.scenarios
        ).join(', ')}`
      );
    }

    return {
      generate: ({ range, clients: { logsEsClient } }) => {
        const { logger } = runOptions;
        const baseRate = parsedBaseRate ?? opts?.baseRate ?? 1;
        const from = runOptions.from as number;
        const baselineWindowMs = baselineMinutes * 60 * 1000;

        const {
          failures,
          volume,
          noise,
          serviceGraph: scenarioGraph,
          entryService: scenarioEntryService,
        } = scenarioId
          ? mockApp.scenarios[scenarioId].build({
              at: incidentAt(from, baselineWindowMs),
            })
          : {
              failures: undefined,
              volume: undefined,
              noise: undefined,
              serviceGraph: undefined,
              entryService: undefined,
            };

        const serviceGraph = scenarioGraph ?? mockApp.serviceGraph;

        const { generator: tick } = sigEvents.buildLogsGenerator({
          // one tick per minute per synthtrace interval; spacing = 60 000 ms / baseRate.
          tickIntervalMs: Math.round(60_000 / baseRate),
          seed,
          serviceGraph,
          entryService: scenarioEntryService ?? mockApp.entryService,
          failures,
          volume,
          noise,
        });

        return withClient(
          logsEsClient,
          logger.perf('generating_sigevents', () => range.interval('1m').rate(1).generator(tick))
        );
      },
    };
  };
}
