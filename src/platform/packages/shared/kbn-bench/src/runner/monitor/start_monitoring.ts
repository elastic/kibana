/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import fs from 'fs';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ProcStats, ProcStatSample } from './types';
import { aggregateProcStatSamples } from '../../report/aggregate_proc_stats';

export async function startMonitoring({
  dir,
  procStatsRefreshInterval = 250,
  log,
}: {
  dir: string;
  procStatsRefreshInterval?: number;
  log: ToolingLog;
}): Promise<() => Promise<ProcStats[]>> {
  // Create a temporary directory where all monitored Node processes will write their stats
  const monitorDir = path.resolve(dir, 'monitor', Math.random().toString().substring(-6));

  await fs.promises.mkdir(monitorDir, { recursive: true });

  const agentPath = require.resolve('./init_monitoring.js');

  const prevNodeOptions = process.env.NODE_OPTIONS ?? '';

  // Add our agent to NODE_OPTIONS and point it at the monitor directory
  const requireFlag = `--require=${agentPath}`;

  process.env.NODE_OPTIONS = [prevNodeOptions, requireFlag].filter(Boolean).join(' ').trim();
  process.env.KBN_BENCH_MONITOR_DIR = monitorDir;
  process.env.KBN_BENCH_MONITOR_INTERVAL = String(procStatsRefreshInterval);

  log.debug(`kbn-bench monitor enabled: dir=${monitorDir}`);

  return async function stopMonitoring() {
    await fs.promises.writeFile(path.join(monitorDir, 'stop'), '1', 'utf8');

    if (prevNodeOptions) {
      const current = process.env.NODE_OPTIONS ?? '';
      const cleaned = current
        .split(' ')
        .filter((part) => part && part !== requireFlag)
        .join(' ');
      process.env.NODE_OPTIONS = cleaned;
    } else {
      delete process.env.NODE_OPTIONS;
    }

    // Give a brief moment for streams to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Read stats from disk and aggregate per PID
    const files: string[] = await fs.promises
      .readdir(monitorDir)
      .then((readFiles) => readFiles.filter((file) => file.endsWith('.ndjson')))
      .catch((error) => {
        log.warning(
          new Error(`Failed to read monitor directory at ${monitorDir}`, {
            cause: error,
          })
        );
        return [];
      });

    const results: ProcStats[] = [];
    for (const file of files) {
      const lines = await fs.promises
        .readFile(path.join(monitorDir, file), 'utf8')
        .then((content) =>
          content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        );

      const samples = lines.map((line) => JSON.parse(line) as ProcStatSample);

      if (samples.length) {
        const stat = aggregateProcStatSamples(samples);

        if (stat.pid !== process.pid) {
          results.push(stat);
        }
      }
    }

    await fs.promises.rm(monitorDir, { recursive: true, force: true });

    return results;
  };
}
