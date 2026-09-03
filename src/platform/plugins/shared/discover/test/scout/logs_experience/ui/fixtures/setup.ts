/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EsClient,
  ScoutParallelWorkerFixtures,
  ScoutTestConfig,
  SpaceSolutionView,
} from '@kbn/scout';
import type { DiscoverSessionApiDataInput } from '../../../../../server/api/schema';
import { LOGS } from './constants';

interface SetupOptions {
  /** Solution view to apply to the space. Defaults to `oblt` so the logs profile resolves. */
  solutionView?: SpaceSolutionView;
}

/**
 * Prepare a space for the logs-in-Discover tests: set the observability solution view (so the
 * logs data source profile resolves) and default Discover to the synthetic time window. The
 * synthetic indices are created once in global setup (see ../parallel_tests/global.setup.ts).
 */
export async function setupLogsExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  config: ScoutTestConfig,
  options: SetupOptions = {}
) {
  const { solutionView = 'oblt' } = options;

  if (!config.serverless) {
    await scoutSpace.setSolutionView(solutionView);
  }

  await scoutSpace.uiSettings.setDefaultTime({
    from: LOGS.DEFAULT_START_TIME,
    to: LOGS.DEFAULT_END_TIME,
  });
}

/**
 * Create a saved Discover session on the metric-shaped index and return its id. Profile resolution
 * keys off the index pattern, not the data view name, and `synth-metrics*` matches none of the
 * allowed log base patterns — so this is the negative case for anything gated on the logs data
 * source profile.
 *
 * The title is suffixed with the space id so parallel workers never collide. Open the result by id
 * (`discover.goto({ savedSearchId })`) rather than through the "Open search" flyout.
 */
export async function createNonLogsDiscoverSession(
  apiServices: ScoutParallelWorkerFixtures['apiServices'],
  spaceId: string,
  title: string
): Promise<string> {
  return apiServices.discover.create(
    {
      title: `${title}-${spaceId}`,
      tabs: [
        {
          id: 'main',
          label: 'Untitled',
          data_source: {
            type: 'data_view_spec',
            index_pattern: LOGS.NON_LOGS_DATA_VIEW,
            time_field: '@timestamp',
            name: LOGS.NON_LOGS_DATA_VIEW,
          },
        },
      ],
    } satisfies DiscoverSessionApiDataInput,
    spaceId
  );
}

/**
 * Delete the synthetic data seeded by global setup. Scoped to this suite's own data streams and
 * index: `logsEsClient.clean()` resolves `logs-*-*`, so it would take every other suite's logs
 * data down with it on a shared or long-lived stack. Shared by global setup (which deletes before
 * seeding so doc counts stay stable across re-runs) and global teardown.
 */
export async function deleteLogsExperienceData(esClient: EsClient) {
  await esClient.indices.deleteDataStream(
    {
      name: [
        `logs-${LOGS.SYNTH_LOGS_DATASET}-${LOGS.SYNTH_LOGS_NAMESPACE}`,
        `logs-${LOGS.SYNTH_DOCVIEWER_DATASET}-${LOGS.SYNTH_LOGS_NAMESPACE}`,
      ].join(','),
    },
    { ignore: [404] }
  );

  await esClient.indices.delete({ index: LOGS.NON_LOGS_INDEX, ignore_unavailable: true });
}

export async function teardownLogsExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
