/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { ScoutTestConfig } from '@kbn/scout-reporting';
import { ScoutTestConfigStats, testConfigs } from '@kbn/scout-reporting';
import { ScoutTestTarget, testTargets } from '@kbn/scout-info';
import { SCOUT_CI_CONFIG_PATH } from '@kbn/scout-info';
import { SCOUT_OUTPUT_ROOT, SCOUT_TEST_CONFIG_STATS_PATH } from '@kbn/scout-info';
import yaml from 'js-yaml';
import { mkdirSync, readFileSync } from 'node:fs';
import { createFlagError } from '@kbn/dev-cli-errors';
import CliTable3 from 'cli-table3';
import dedent from 'dedent';
import type { ToolingLog } from '@kbn/tooling-log';
import { writeFileSync } from 'node:fs';
import path from 'path';
import { findPackageForPath } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { TestTrackLoad } from '../execution/test_track';
import { TestTrack } from '../execution/test_track';

export interface ScoutCIConfig {
  plugins: {
    enabled: string[];
    disabled: string[];
  };
  packages: {
    enabled: string[];
    disabled: string[];
  };
  excluded_configs: string[];
}

function loadScoutCIConfig(): ScoutCIConfig {
  try {
    return yaml.load(readFileSync(SCOUT_CI_CONFIG_PATH, 'utf-8')) as ScoutCIConfig;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw createFlagError(`Failed to load Scout CI config: ${message}`);
  }
}

function loadTestConfigStats(): ScoutTestConfigStats {
  try {
    return ScoutTestConfigStats.fromFile(SCOUT_TEST_CONFIG_STATS_PATH);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw createFlagError(`Failed to load Scout test config stats: ${message}`);
  }
}

export interface ScoutCITestLoad {
  config: ScoutTestConfig;
  enabled: boolean;
  stats?: ScoutTestConfigStats['data']['configs'][0];
}

export function identifyTestLoads(
  scoutCIConfig: ScoutCIConfig,
  testConfigStats: ScoutTestConfigStats,
  testTarget: ScoutTestTarget,
  moduleIDs: Set<string>,
  log: ToolingLog
): ScoutCITestLoad[] {
  const testLoads = testConfigs.all
    .filter((config) => !scoutCIConfig.excluded_configs.includes(config.path))
    .filter((config) =>
      config.manifest.tests.find((test) => {
        return test.tags.includes(testTarget.playwrightTag);
      })
    )
    .filter((config) => {
      if (moduleIDs.size === 0) return true;
      const resolvedModuleID = findPackageForPath(REPO_ROOT, config.path)?.id;
      return resolvedModuleID ? moduleIDs.has(resolvedModuleID) : false;
    })
    .map((config) => {
      let enabled: boolean;
      switch (config.module.type) {
        case 'plugin':
          enabled = !scoutCIConfig.plugins.disabled?.includes(config.module.name);
          break;

        case 'package':
          enabled = !scoutCIConfig.packages.disabled?.includes(config.module.name);
          break;
      }

      return {
        config,
        enabled,
        stats: testConfigStats.data.configs.find(
          (statsEntry) =>
            statsEntry.path === config.path && statsEntry.test_target.tag === testTarget.tag
        ),
      };
    });

  // Process test loads
  if (testLoads.length === 0) {
    log.warning(`No test loads discovered for test target '${testTarget.tag}'`);
    return testLoads;
  }

  const enabledTestLoadCount = testLoads.filter((load) => load.enabled).length;
  const disabledTestLoadCount = testLoads.filter((load) => !load.enabled).length;
  const totalTestLoadCount = testLoads.length;
  log.info(
    `Found ${totalTestLoadCount} test loads for test target '${testTarget.tag}'` +
      ` (enabled: ${enabledTestLoadCount}, disabled: ${disabledTestLoadCount})`
  );

  return testLoads;
}

export function buildTrack(
  runtimeTarget: number,
  estimatedLaneSetupDuration: number,
  testTarget: ScoutTestTarget,
  testLoads: ScoutCITestLoad[],
  log: ToolingLog
) {
  const track = new TestTrack({ runtimeTarget, estimatedLaneSetupDuration });
  track.metadata.testTarget = testTarget;

  // Prepare loads for assignment
  const loads: TestTrackLoad[] = [];

  testLoads.forEach((load) => {
    if (load.stats === undefined) {
      log.warning(
        `No stats available for config at path '${load.config.path}' and test target '${testTarget.tag}'`
      );

      // Because no stats are available, we're going to use an entire lane's length
      // as the runtime estimate
      loads.push({
        id: load.config.path,
        stats: {
          runCount: 0,
          runtime: {
            avg: 0,
            median: 0,
            pc95th: 0,
            pc99th: 0,
            max: 0,
            estimate: track.runtimeTarget - track.estimatedLaneSetupDuration,
          },
        },
        metadata: {
          server: load.config.server,
          testConfig: {
            type: load.config.type,
          },
        },
      });
      return;
    }

    loads.push({
      id: load.stats.path,
      stats: {
        runCount: load.stats.runCount,
        runtime: load.stats.runtime,
      },
      metadata: {
        server: load.config.server,
        testConfig: {
          type: load.config.type,
        },
      },
    });
  });

  loads
    // Sort the loads in descending order based on their runtime estimate. The order is important
    // to ensure we get the highest possible lane saturation.
    //
    // When we iterate over these to assign them to the least loaded lane, the runtime will get
    // smaller and smaller, increasing the chance that the load will fit into an existing lane
    // rather than having to open a new one to avoid congestion.
    .sort((a, b) => b.stats.runtime.estimate - a.stats.runtime.estimate)
    .forEach((load) => {
      const lane = track.addLoadToLeastCongestedLane(load, true);
      log.debug(`Routed load with ID '${load.id}' to lane #${lane.number}`);
    });

  log.debug(`Routed ${loads.length} loads to ${track.laneCount} lanes`);

  // Final updates to lane metadata
  track.lanes.forEach((lane) => {
    const usesParallelWorkers = lane.loads.find(
      (load) => load.metadata.testConfig.type === 'parallel'
    );

    lane.metadata.buildkite = {
      agentQueue: usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot',
    };
  });

  return track;
}

export function msToHuman(ms: number): string {
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

function displaySingleTrackSummary(
  track: TestTrack,
  configStats: ScoutTestConfigStats,
  log: ToolingLog
) {
  const spec = track.specification;
  const panel = new CliTable3();

  panel.push([{ content: 'Test track summary', hAlign: 'center' }]);

  if (track.metadata.server) {
    panel.push([
      dedent(`\
        Server
           Config set : ${track.metadata.server.configSet}
        `),
    ]);
  }

  if (track.metadata.testTarget) {
    panel.push([
      dedent(`\
        Test target
           Location     : ${track.metadata.testTarget.location}
           Architecture : ${track.metadata.testTarget.arch}
           Domain       : ${track.metadata.testTarget.domain}
        `),
    ]);
  }

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

function displayMultiTrackSummary(
  tracks: TestTrack[],
  configStats: ScoutTestConfigStats,
  log: ToolingLog
) {
  if (tracks.length === 0) {
    throw createFlagError('Multi-track summary requested, but the provided track list is empty');
  }

  const panel = new CliTable3();
  panel.push([{ content: 'Multi-track summary', hAlign: 'center' }]);

  panel.push([
    dedent(`\
        Config stats
          Last updated    : ${configStats.data.lastUpdated}
          Lookback length : ${configStats.data.lookbackDays}d
          BK pipeline     : ${configStats.data.buildkite.pipeline?.slug || 'all'}
          BK branch       : ${configStats.data.buildkite.branch || 'any'}
        `),
  ]);

  const combinedRuntime = {
    target: 0,
    expected: 0,
    unused: 0,
    overflow: 0,
  };

  tracks.forEach((track) => {
    const trackSpec = track.specification;
    combinedRuntime.target += trackSpec.stats.combinedRuntime.target;
    combinedRuntime.expected += trackSpec.stats.combinedRuntime.expected;
    combinedRuntime.unused += trackSpec.stats.combinedRuntime.unused;
    combinedRuntime.overflow += trackSpec.stats.combinedRuntime.overflow;
  });

  const sharedTargetRuntime = tracks[0].runtimeTarget;
  const saturationPc = (combinedRuntime.expected / combinedRuntime.target) * 100;

  panel.push([
    dedent(`\
        Combined track stats
          Track count            : ${tracks.length}
          Shared runtime target  : ${msToHuman(sharedTargetRuntime)}
          Expected runtime       : ${msToHuman(combinedRuntime.expected)}
          Unused runtime         : ${msToHuman(combinedRuntime.unused)}
          Expected overflow      : ${msToHuman(combinedRuntime.overflow)}
          Overall saturation     : ${saturationPc.toFixed(2)}%
        `),
  ]);

  const table = new CliTable3({
    head: [
      '#',
      'Location',
      'Arch',
      'Domain',
      'Server config',
      'Runtime estimate',
      'Loads',
      'Available capacity',
      'Status',
      'Congested',
    ],
  });

  tracks.forEach((track) =>
    track.specification.lanes.forEach((lane) => {
      table.push([
        table.length + 1,
        track.metadata.testTarget.location,
        track.metadata.testTarget.arch,
        track.metadata.testTarget.domain,
        track.metadata.server.configSet,
        msToHuman(lane.runtimeEstimate),
        lane.loads.length,
        msToHuman(lane.availableCapacity),
        lane.status,
        lane.isCongested ? 'yes' : 'no',
      ]);
    })
  );

  panel.push(['Lanes\n' + table.toString()]);
  log.write('\n');
  log.write(panel.toString());
}

export const createTestTracks: Command<void> = {
  name: 'create-test-tracks',
  description: 'Distribute tests across test tracks for parallel execution',
  flags: {
    string: [
      'testTarget',
      'serverConfigSet',
      'targetRuntimeMinutes',
      'minRuntimeMinutes',
      'estimatedLaneSetupMinutes',
      'moduleFilterPath',
    ],
    boolean: ['showIndividualTrackSummaries', 'showMultiTrackSummary'],
    default: {
      outputPath: `${SCOUT_OUTPUT_ROOT}/test_tracks/${Date.now()}.json`,
    },
    help: `
    --testTarget                    (required)  One or more test target in the {location}-{arch}-{domain} format
    --outputPath                    (optional)  Where to write the test track specification [default: ${SCOUT_OUTPUT_ROOT}/test_tracks/{timestamp}.json]
    --targetRuntimeMinutes          (optional)  How long the test track should run [default: longest estimated load runtime]
    --minRuntimeMinutes             (optional)  Target runtime minutes shouldn't be lower than this
    --estimatedLaneSetupMinutes     (optional)  How long a lane setup is expected to take
    --showIndividualTrackSummaries  (optional)  Display individual test track summaries
    --showMultiTrackSummary         (optional)  Display multi-track summary
    --moduleFilterPath              (optional)  Path to a JSON file of @kbn/ module IDs; only configs belonging to those modules will be distributed
    `,
  },
  run: async ({ flagsReader, log }) => {
    const moduleIds: Set<string> = new Set();
    const moduleFilterPath = flagsReader.string('moduleFilterPath');

    if (moduleFilterPath) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(moduleFilterPath, 'utf-8'));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw createFlagError(
          `Failed to read '${moduleFilterPath}': ${message}. ` +
            `Ensure the file exists and is a valid JSON array of @kbn/ module IDs.`
        );
      }

      if (!Array.isArray(parsed)) {
        throw createFlagError(`Expected '${moduleFilterPath}' to contain a JSON array.`);
      }

      parsed.forEach((id) => moduleIds.add(id));
      log.info(
        `Limiting test load selection to the following modules: ${Array.from(moduleIds).join(', ')}`
      );
    }

    const selectedTestTargets: ScoutTestTarget[] = flagsReader
      .requiredArrayOfStrings('testTarget')
      .map(ScoutTestTarget.fromTag);

    if (selectedTestTargets.length === 0) {
      throw createFlagError('No test targets specified');
    }

    selectedTestTargets.forEach((testTarget) => {
      if (!testTargets.all.find((validTarget) => validTarget.tag === testTarget.tag)) {
        throw createFlagError(`${testTarget.tag} is not a valid location/arch/domain combo.`);
      }
    });

    log.info(
      'Identifying test loads for the following test targets: ' +
        selectedTestTargets.map((target) => target.tag).join(', ')
    );

    const testConfigStats = loadTestConfigStats();
    const scoutCIConfig = loadScoutCIConfig();

    const testLoadsByTarget = selectedTestTargets.reduce((loadsByTarget, target) => {
      loadsByTarget.set(
        target,
        identifyTestLoads(scoutCIConfig, testConfigStats, target, moduleIds, log)
      );
      return loadsByTarget;
    }, new Map<ScoutTestTarget, ScoutCITestLoad[]>());

    const estimatedLaneSetupDuration =
      (flagsReader.number('estimatedLaneSetupMinutes') || 0) * 60 * 1000;

    if (estimatedLaneSetupDuration > 0) {
      log.info(
        `Each track lane is expected to take ~${msToHuman(estimatedLaneSetupDuration)} to set up.`
      );
    } else {
      log.warning("Assuming lanes won't need any time to set up.");
    }

    let runtimeTarget = (flagsReader.number('targetRuntimeMinutes') || 0) * 60 * 1000;

    if (runtimeTarget === 0) {
      // No runtime target was set, so we'll use the longest load runtime estimate plus the lane setup time estimate
      runtimeTarget =
        estimatedLaneSetupDuration +
        testLoadsByTarget
          .values()
          .flatMap((loads) => loads)
          .filter((load) => load.enabled)
          .map((load): number => load.stats?.runtime.estimate || 0)
          .reduce((prevEstimate, currentEstimate) => Math.max(prevEstimate, currentEstimate), 0);
    }

    if (runtimeTarget === 0) {
      // Runtime target is *still* zero, which is unacceptable !!!
      // This would suggest that a target runtime wasn't set, and we also didn't find stats for any of the configs
      throw createFlagError(
        "Failed to auto-determine runtime target: couldn't find stats for any of the given configs"
      );
    }

    const minimumRuntime = (flagsReader.number('minRuntimeMinutes') || 0) * 60 * 1000;
    runtimeTarget = Math.max(minimumRuntime, runtimeTarget);

    log.info(`All tracks will use a runtime target of ${msToHuman(runtimeTarget)}`);

    const tracks = testLoadsByTarget
      .entries()
      .flatMap(([target, loads]) => {
        if (target.location === 'cloud') {
          log.warning(
            `Only the 'default' config set will be scheduled for test target '${target.tag}'` +
              ' because custom server configurations are only supported with local targets.'
          );
        }

        const configSets =
          target.location === 'cloud'
            ? ['default']
            : [...new Set(loads.map((load) => load.config.server.configSet))];

        // Each server config set gets its own track
        return configSets.map((configSet) => {
          log.info(
            `Building test track for test target '${target.tag}' with server config set '${configSet}'`
          );
          const track = buildTrack(
            Math.max(minimumRuntime, runtimeTarget),
            estimatedLaneSetupDuration,
            target,
            loads.filter((load) => load.enabled && load.config.server.configSet === configSet),
            log
          );
          track.metadata.server = { configSet };
          return track;
        });
      })
      .toArray();

    // Write track specifications
    const outputPath = flagsReader.requiredString('outputPath');
    log.info(`Writing test track specification to ${outputPath}`);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          tracks: tracks.map((track) => track.specification),
        },
        null,
        2
      )
    );

    if (flagsReader.boolean('showIndividualTrackSummaries')) {
      log.info('Displaying individual track summaries');
      tracks.forEach((track) => displaySingleTrackSummary(track, testConfigStats, log));
    }

    if (flagsReader.boolean('showMultiTrackSummary')) {
      log.info('Displaying multi-track summary');
      displayMultiTrackSummary(tracks, testConfigStats, log);
    }

    log.success(`Finished in ${(performance.now() / 1000).toFixed(2)}s`);
  },
};
