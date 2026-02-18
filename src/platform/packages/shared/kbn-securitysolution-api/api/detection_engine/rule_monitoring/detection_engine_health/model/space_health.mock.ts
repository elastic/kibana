/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { healthStatsMock } from './health_stats.mock';
import type { SpaceHealthSnapshot } from './space_health';

const getEmptySpaceHealthSnapshot = (): SpaceHealthSnapshot => {
  return {
    state_at_the_moment: healthStatsMock.getEmptyHealthOverviewState(),
    stats_over_interval: healthStatsMock.getEmptyHealthOverviewStats(),
    history_over_interval: {
      buckets: [
        {
          timestamp: '2023-05-15T16:12:14.967Z',
          stats: healthStatsMock.getEmptyHealthOverviewStats(),
        },
      ],
    },
  };
};

export const spaceHealthSnapshotMock = {
  getEmptySpaceHealthSnapshot,
};
