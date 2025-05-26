/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient, ScoutLogger, measurePerformanceAsync } from '../../../../../common';
import { ScoutParallelWorkerFixtures } from '../../../parallel_run_fixtures';

export interface StreamsApiService {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export const getStreamsApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): StreamsApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  return {
    enable: async () => {
      await measurePerformanceAsync(log, 'streamsApi.enable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/_enable`,
        });
      });
    },
    disable: async () => {
      await measurePerformanceAsync(log, 'streamsApi.disable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/_disable`,
        });
      });
    },
  };
};
