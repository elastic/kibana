/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import { ScoutTestConfigStats } from '@kbn/scout-reporting';
import { SCOUT_OUTPUT_ROOT, SCOUT_TEST_CONFIG_STATS_PATH } from '@kbn/scout-info';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { z } from '@kbn/zod/v4';
import { createFlagError } from '@kbn/dev-cli-errors';
import CliTable3 from 'cli-table3';
import dedent from 'dedent';
import type { ToolingLog } from '@kbn/tooling-log';
import { writeFileSync } from 'node:fs';
import type { TestTrackLoad } from '../execution/test_track';
import { TestTrack } from '../execution/test_track';

export const ScoutConfigManifestSchema = z.object({
  enabled: z
    .array(z.string())
    .nullish()
    .default([])
    .transform((value) => value ?? []),
  disabled: z
    .array(z.string())
    .nullish()
    .default([])
    .transform((value) => value ?? []),
});

export type ScoutConfigManifest = z.infer<typeof ScoutConfigManifestSchema>;

function mergeConfigManifests(manifestPaths: string[]): ScoutConfigManifest {
  const mergedManifest: ScoutConfigManifest = { enabled: [], disabled: [] };

  manifestPaths.forEach((manifestPath) => {
    const manifest = ScoutConfigManifestSchema.parse(
      yaml.load(readFileSync(manifestPath, 'utf-8'))
    );
    mergedManifest.enabled.push(...manifest.enabled);
    mergedManifest.disabled.push(...manifest.disabled);
  });

  return mergedManifest;
}

function loadTestConfigStats(): ScoutTestConfigStats {
  try {
    return ScoutTestConfigStats.fromFile(SCOUT_TEST_CONFIG_STATS_PATH);
  } catch (e) {
    throw createFlagError(e.message);
  }
}

function msToHuman(ms: number): string {
  if (ms === 0) {
    return '0s';
  }

  let prefix = '';

  if (ms < 0) {
    prefix = '-';
    ms = Math.abs(ms);
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const elements: Array<[number, string]> = [
    [hours, 'h'],
    [minutes, 'm'],
    [seconds, 's'],
  ];

  let output =
    prefix +
    elements
      .filter(([value, _]) => value > 0)
      .map(([value, unit]) => `${value}${unit}`)
      .join(' ');

  if (output.length === 0) {
    output = ms >= 10 ? ((ms % 1000) / 1000).toFixed(2) + 's' : '0s';
  }

  return output;
}

function displaySummary(track: TestTrack, configStats: ScoutTestConfigStats, log: ToolingLog) {
  const spec = track.specification;
  const panel = new CliTable3();

  panel.push([{ content: 'Test track summary', hAlign: 'center' }]);

  panel.push([
    dedent(`\
        Config stats
          Last updated    : ${configStats.data.lastUpdated}
          Lookback length : ${configStats.data.lookbackDays}d
          BK pipeline     : ${configStats.data.buildkite.pipeline?.slug || 'all'}
          BK branch       : ${configStats.data.buildkite.branch || 'any'}
        `),
  ]);
  panel.push([
    dedent(`\
        Lane
          Shortest   : ${msToHuman(spec.stats.lane.shortestEstimate)}
          Longest    : ${msToHuman(spec.stats.lane.longestEstimate)}
          Saturation : ${spec.stats.lane.saturationPercent}%
          Count      : ${spec.stats.lane.count}
        `),
  ]);
  panel.push([
    dedent(`\
        Combined runtime
          Target   : ${msToHuman(spec.stats.combinedRuntime.target)}
          Expected : ${msToHuman(spec.stats.combinedRuntime.expected)}
          Unused   : ${msToHuman(spec.stats.combinedRuntime.unused)}
          Overflow : ${msToHuman(spec.stats.combinedRuntime.overflow)}
        `),
  ]);

  const table = new CliTable3({
    head: ['#', 'Runtime estimate', 'Loads', 'Available capacity', 'Status', 'Congested'],
  });

  spec.lanes.forEach((lane) => {
    table.push([
      lane.number,
      msToHuman(lane.runtimeEstimate),
      lane.loads.length,
      msToHuman(lane.availableCapacity),
      lane.status,
      lane.isCongested ? 'yes' : 'no',
    ]);
  });
  panel.push(['Lanes\n' + table.toString()]);
  log.write('\n');
  log.write(panel.toString());
}

export const createTestTrack: Command<void> = {
  name: 'create-test-track',
  description: 'Distribute tests across a test track for parallel execution',
  flags: {
    string: ['configManifest', 'targetRuntimeMinutes', 'minRuntimeMinutes', 'maxLaneCount'],
    boolean: ['noSummary'],
    default: {
      outputPath: `${SCOUT_OUTPUT_ROOT}/test_track_${Date.now()}.json`,
    },
    help: `
    --configManifest        (required)  Path to config manifest; can be specified multiple times
    --outputPath            (optional)  Where to write the test track specification (default: ./scout_test_track_{timestamp}.json)
    --targetRuntimeMinutes  (optional)  How long the test track should run (default: longest estimated config runtime)
    --minRuntimeMinutes     (optional)  Target runtime minutes shouldn't be lower than this
    --maxLaneCount          (optional)  Maximum number of lanes allowed
    --noSummary             (optional)  Don't display test track summary
    `,
  },
  run: async ({ flagsReader, log }) => {
    // Process config manifests
    const configManifestPaths = flagsReader.requiredArrayOfPaths('configManifest');

    if (configManifestPaths.length === 0) {
      throw createFlagError('No config manifests were provided');
    }

    log.info(`Loading ${configManifestPaths.length} manifests`);
    const mergedConfigManifest = mergeConfigManifests(configManifestPaths);
    const enabledConfigCount = mergedConfigManifest.enabled.length;
    const disabledConfigCount = mergedConfigManifest.disabled.length;
    const totalConfigCount = enabledConfigCount + disabledConfigCount;
    log.info(
      `Found ${totalConfigCount} configs (enabled: ${enabledConfigCount}, disabled: ${disabledConfigCount})`
    );

    // Load stats & initialize test track
    const stats = loadTestConfigStats();

    let runtimeTarget = (flagsReader.number('targetRuntimeMinutes') || 0) * 60 * 1000;
    const runtimeMin = (flagsReader.number('minRuntimeMinutes') || 0) * 60 * 1000;

    if (runtimeTarget === 0) {
      // No runtime target was set, so we'll use the longest runtime estimate
      runtimeTarget = mergedConfigManifest.enabled
        .map((configPath): number => stats.findConfigByPath(configPath)?.runtime.estimate || 0)
        .reduce((prevEstimate, currentEstimate) => Math.max(prevEstimate, currentEstimate));
    }

    if (runtimeTarget === 0) {
      // Runtime target is *still* zero, which is unacceptable !!!
      // This would suggest that a target runtime wasn't set, and we also didn't find stats for any of the configs
      throw createFlagError(
        "Failed to auto-determine runtime target: couldn't find stats for any of the given configs"
      );
    }

    const track = new TestTrack({ runtimeTarget: Math.max(runtimeMin, runtimeTarget) });
    log.info(`Targeting a track runtime of ${msToHuman(track.runtimeTarget)}`);

    // Prepare loads for assignment
    const loads: TestTrackLoad[] = [];

    mergedConfigManifest.enabled.forEach((configPath) => {
      const configStats = stats.findConfigByPath(configPath);

      if (configStats === undefined) {
        log.warning(`No stats available for config at path '${configPath}'`);

        // Because no stats are available, we're going to use an entire's lane length
        // as the runtime estimate
        loads.push({
          id: configPath,
          stats: {
            runCount: 0,
            runtime: {
              avg: 0,
              median: 0,
              pc95th: 0,
              pc99th: 0,
              max: 0,
              estimate: track.runtimeTarget,
            },
          },
        });
        return;
      }

      loads.push({
        id: configStats.path,
        stats: {
          runCount: configStats.runCount,
          runtime: configStats.runtime,
        },
      });
    });

    // Assign loads to lanes
    const maxLaneCount = flagsReader.number('maxLaneCount');

    if (maxLaneCount !== undefined) {
      log.info(`Won't open more than ${maxLaneCount} lanes`);
    }

    const shouldAllowNewLanes = (): boolean => {
      if (maxLaneCount === undefined) {
        // No lane limit in place
        return true;
      }

      return track.laneCount < maxLaneCount;
    };

    loads
      // Sort the loads in descending order based on their runtime estimate. The order is important
      // to ensure we get the highest possible lane saturation.
      //
      // When we iterate over these to assign them to the least loaded lane, the runtime will get
      // smaller and smaller, increasing the chance that the load will fit into an existing lane
      // rather than having to open a new one to avoid congestion.
      .sort((a, b) => b.stats.runtime.estimate - a.stats.runtime.estimate)
      .forEach((load) => {
        const lane = track.addLoadToLeastCongestedLane(load, shouldAllowNewLanes());
        log.debug(`Routed config ${load.id} to lane #${lane.number}`);
      });

    log.info(`Routed ${loads.length} configs to ${track.laneCount} lanes`);

    // Write track specification
    const outputPath = flagsReader.requiredString('outputPath');
    log.info(`Writing test track specification to ${outputPath}`);
    writeFileSync(outputPath, JSON.stringify(track.specification, null, 2));

    log.success(`Finished in ${(performance.now() / 1000).toFixed(2)}s`);

    if (flagsReader.boolean('noSummary')) {
      return;
    }
    displaySummary(track, stats, log);
  },
};
