/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { CiStatsReporter } from './ci_stats_reporter';

export const getTimeReporter = (log: ToolingLog, group: string) => {
  const reporter = CiStatsReporter.fromEnv(log);
  return async (startTime: number, id: string, meta: Record<string, any>) => {
    await reporter.timings({
      timings: [
        {
          group,
          id,
          ms: Date.now() - startTime,
          meta,
        },
      ],
    });
  };
};
