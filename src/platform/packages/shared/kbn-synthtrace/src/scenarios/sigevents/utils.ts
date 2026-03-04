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
} from '../../lib/service_graph_logs/types';
import type {
  ChannelEntry,
  ChannelVolume,
  FailureMap,
  FailuresOrFn,
  NoiseConfig,
} from '../../lib/service_graph_logs/types';
import { sigEvents } from '../../lib/service_graph_logs';
import { withClient } from '../../lib/utils/with_client';
/** Parsed `--scenarioOpts` keys for sigevents scenarios. */
interface ScenarioOpts {
  seed?: string;
  baselineMinutes?: string;
  mockApp?: string;
  scenario?: string;
  baseRate?: string;
}

/** Return value of `ScenarioDefinition.build`; drives log generation for one scenario run. */
export interface ScenarioBuildResult<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** Override the service graph; defaults to the mock app's graph. */
  serviceGraph?: TServiceGraph;
  /** Override the entry service; defaults to the mock app's `entryService`. */
  entryService?: ServiceNamesOf<TServiceGraph>;
  failures?: FailuresOrFn<ServiceNamesOf<TServiceGraph>, ServiceDependenciesOf<TServiceGraph>>;
  volume?: ChannelVolume<ServiceNamesOf<TServiceGraph> | ServiceDependenciesOf<TServiceGraph>>;
  noise?: NoiseConfig;
  /** Red-herring messages for technologies absent from the service graph. Fires every tick — not time-scoped. */
  ghostMentions?: NoiseConfig['ghostMentions'];
}

export interface PhaseVolumeEntry {
  /** 0 = silence, 1 = normal, N = N× burst. */
  scale: number;
}

/** Volume spike per service or infra dep key, scoped to the phase window. */
export type PhaseVolumeConfig<TName extends string = string> = Partial<
  Record<TName, PhaseVolumeEntry>
>;

type VolumeKey<TServiceGraph extends ServiceGraph> =
  | ServiceNamesOf<TServiceGraph>
  | ServiceDependenciesOf<TServiceGraph>;

/** Failures, volume, and noise for a single time-bounded phase — all scoped to `[start, end)`. */
export interface PhaseConfig<TServiceGraph extends ServiceGraph = ServiceGraph> {
  failures?: FailureMap<ServiceNamesOf<TServiceGraph>, ServiceDependenciesOf<TServiceGraph>>;
  volume?: PhaseVolumeConfig<ServiceNamesOf<TServiceGraph> | ServiceDependenciesOf<TServiceGraph>>;
  /** 0 = silence, 1 = normal, N = N× burst. */
  noise?: { scale: number };
}

/** Context injected into `ScenarioDefinition.build`. */
export interface PhaseContext<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** Converts a duration string offset from the incident start to an absolute timestamp. `'0m'` = incident start. */
  at: (offset: string) => number;
  /** Builds a result fragment with all config scoped to `[start, end)`. */
  phase: (
    start: string,
    end: string,
    config: PhaseConfig<TServiceGraph>
  ) => ScenarioBuildResult<TServiceGraph>;
  /** Merges multiple phase fragments into one result. */
  phases: (list: Array<ScenarioBuildResult<TServiceGraph>>) => ScenarioBuildResult<TServiceGraph>;
}

/** A failure scenario with a `build` factory. */
export interface ScenarioDefinition<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** When set, the scenario loops every N minutes in `--live` mode. Omit for open-ended scenarios. */
  cycleDurationMinutes?: number;
  build(ctx: PhaseContext<TServiceGraph>): ScenarioBuildResult<TServiceGraph>;
}

/** Bundles a service topology, entry service, and failure scenario registry for a mock application. */
export interface MockAppDefinition<TServiceGraph extends ServiceGraph = ServiceGraph> {
  serviceGraph: TServiceGraph;
  entryService: ServiceNamesOf<TServiceGraph>;
  scenarios: Record<string, ScenarioDefinition<TServiceGraph>>;
}

export function parseOpts(raw: Record<string, unknown> | undefined): {
  seed: number;
  baselineMinutes: number;
  mockApp: string;
  scenario: string | undefined;
  baseRate: number;
} {
  const opts = (raw ?? {}) as ScenarioOpts;
  const seed = opts.seed !== undefined ? Number(opts.seed) : Math.floor(Math.random() * 100000);
  if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error(
      `Invalid scenario option "seed": expected a finite integer, got "${opts.seed}"`
    );
  }
  const baselineMinutes = opts.baselineMinutes !== undefined ? Number(opts.baselineMinutes) : 0;
  if (!Number.isFinite(baselineMinutes) || baselineMinutes < 0) {
    throw new Error(
      `Invalid scenario option "baselineMinutes": expected a non-negative number of minutes, got "${opts.baselineMinutes}"`
    );
  }
  const baseRate = opts.baseRate !== undefined ? Number(opts.baseRate) : 1;
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    throw new Error(
      `Invalid scenario option "baseRate": expected a positive number, got "${opts.baseRate}"`
    );
  }
  return {
    seed,
    baselineMinutes,
    mockApp: opts.mockApp ?? 'default',
    scenario: opts.scenario,
    baseRate,
  };
}

/** Converts a duration string to milliseconds (`'30s'`, `'5m'`, `'1h'`, `'2d'`). */
export const duration = (s: string): number => {
  const { intervalAmount, intervalUnit } = parseInterval(s);
  return moment.duration(intervalAmount, intervalUnit).asMilliseconds();
};

/** Returns `(offset) => absoluteTimestamp` anchored to the incident start (`'0m'`). */
export const incidentAt =
  (from: number, baselineWindowMs: number) =>
  (offset: string): number =>
    from + baselineWindowMs + duration(offset);

/** Builds a `PhaseContext` anchored to a given `at` function. */
export const makePhaseContext = <TServiceGraph extends ServiceGraph = ServiceGraph>(
  atFn: (offset: string) => number
): PhaseContext<TServiceGraph> => {
  const phase = (
    start: string,
    end: string,
    config: PhaseConfig<TServiceGraph>
  ): ScenarioBuildResult<TServiceGraph> => {
    const startTs = atFn(start);
    const endTs = atFn(end);
    const result: ScenarioBuildResult<TServiceGraph> = {};

    if (config.failures) {
      const failureMap = config.failures;
      result.failures = (ts: number) => (ts >= startTs && ts < endTs ? failureMap : undefined);
    }

    if (config.volume) {
      const volumeResult: ChannelVolume<VolumeKey<TServiceGraph>> = {};
      for (const [key, entry] of Object.entries(config.volume) as Array<
        [VolumeKey<TServiceGraph>, PhaseVolumeEntry | undefined]
      >) {
        if (entry !== undefined) {
          volumeResult[key] = {
            spikes: [{ start: startTs, end: endTs, scale: entry.scale }],
          };
        }
      }
      result.volume = volumeResult;
    }

    if (config.noise !== undefined) {
      result.noise = {
        volume: { spikes: [{ start: startTs, end: endTs, scale: config.noise.scale }] },
      };
    }

    return result as ScenarioBuildResult<TServiceGraph>;
  };

  /**
   * Merges multiple scenario phases into one. For all spike and failure lookups,
   * earlier entries in `list` take precedence over later ones ("first match wins").
   * Pass phases in order of decreasing specificity (most specific first).
   */
  const phases = (
    list: Array<ScenarioBuildResult<TServiceGraph>>
  ): ScenarioBuildResult<TServiceGraph> => {
    const merged: ScenarioBuildResult<TServiceGraph> = {};

    const failureFns = list
      .filter((r) => r.failures !== undefined)
      .map(
        (r) =>
          r.failures as FailuresOrFn<
            ServiceNamesOf<TServiceGraph>,
            ServiceDependenciesOf<TServiceGraph>
          >
      );

    if (failureFns.length > 0) {
      merged.failures = (ts: number) => {
        for (const fn of failureFns) {
          const result = typeof fn === 'function' ? fn(ts) : fn;
          if (result !== undefined) return result;
        }
        return undefined;
      };
    }

    const volumeMap: ChannelVolume<VolumeKey<TServiceGraph>> = {};
    for (const r of list) {
      if (!r.volume) continue;
      for (const [key, entry] of Object.entries(r.volume) as Array<
        [VolumeKey<TServiceGraph>, ChannelEntry | undefined]
      >) {
        if (!entry) continue;
        if (!volumeMap[key]) {
          volumeMap[key] = { ...entry };
        } else {
          volumeMap[key] = {
            ...volumeMap[key],
            rate: volumeMap[key].rate ?? entry.rate,
            every: volumeMap[key].every ?? entry.every,
            spikes: [...(volumeMap[key].spikes ?? []), ...(entry.spikes ?? [])],
          };
        }
      }
    }
    if (Object.keys(volumeMap).length > 0) {
      merged.volume = volumeMap;
    }

    const noiseVolumes = list.map((r) => r.noise?.volume).filter((v) => v !== undefined);
    if (noiseVolumes.length > 0) {
      const mergedNoiseVolume = noiseVolumes.reduce((acc, v) => ({
        rate: acc.rate ?? v.rate,
        every: acc.every ?? v.every,
        jitter: acc.jitter ?? v.jitter,
        spikes: [...(acc.spikes ?? []), ...(v.spikes ?? [])],
      }));
      merged.noise = { volume: mergedNoiseVolume };
    }

    const seenMessages = new Set<string>();
    const ghostMentions = list
      .flatMap((r) => r.ghostMentions ?? [])
      .filter((g) => {
        if (seenMessages.has(g.message)) return false;
        seenMessages.add(g.message);
        return true;
      });
    if (ghostMentions.length > 0) {
      merged.ghostMentions = ghostMentions;
    }

    return merged as ScenarioBuildResult<TServiceGraph>;
  };

  return { at: atFn, phase, phases };
};

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
  mockApps: Record<string, MockAppDefinition<TServiceGraph>>
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
        const { logger, from } = runOptions;
        const baseRate = parsedBaseRate;
        const baselineWindowMs = duration('1m') * baselineMinutes;

        const activeScenario = scenarioId ? mockApp.scenarios[scenarioId] : undefined;

        const {
          failures: rawFailures,
          volume,
          noise: scenarioNoise,
          ghostMentions,
          serviceGraph: scenarioGraph,
          entryService: scenarioEntryService,
        } = activeScenario
          ? activeScenario.build(
              makePhaseContext<TServiceGraph>(incidentAt(from, baselineWindowMs))
            )
          : {};

        const noise: NoiseConfig | undefined =
          scenarioNoise || ghostMentions
            ? { ...(scenarioNoise ?? {}), ...(ghostMentions ? { ghostMentions } : {}) }
            : undefined;

        const cycleDurationMs = activeScenario?.cycleDurationMinutes
          ? activeScenario.cycleDurationMinutes * duration('1m')
          : undefined;

        const incidentStartMs = from + baselineWindowMs;

        const failures = (() => {
          if (!rawFailures || !cycleDurationMs || typeof rawFailures !== 'function') {
            return rawFailures;
          }
          return (ts: number) => {
            if (ts < incidentStartMs) {
              return rawFailures(ts);
            }
            const elapsed = ts - incidentStartMs;
            return rawFailures(incidentStartMs + (elapsed % cycleDurationMs));
          };
        })();

        const serviceGraph = scenarioGraph ?? mockApp.serviceGraph;

        const { generator: tick } = sigEvents.buildLogsGenerator({
          tickIntervalMs: duration('1m'),
          seed,
          serviceGraph,
          cycleMs: cycleDurationMs,
          cycleOriginMs: cycleDurationMs != null ? incidentStartMs : undefined,
          entryService: scenarioEntryService ?? mockApp.entryService,
          failures,
          volume,
          noise,
        });

        return withClient(
          logsEsClient,
          logger.perf('generating_sigevents', () =>
            range.interval('1m').rate(baseRate).generator(tick)
          )
        );
      },
    };
  };
}
