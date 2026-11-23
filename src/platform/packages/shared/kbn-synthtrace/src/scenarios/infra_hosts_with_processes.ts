/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates ECS hosts with process metrics for the Processes tab of the host details
 * (Infrastructure Inventory and Hosts flyouts).
 *
 * The Processes tab only shows the last minute of data, so run it with `--live`.
 *
 * Scenario options:
 * - numHosts (number, default: 1): hosts named `host-with-processes-<index>`
 *
 * Run:
 *   node scripts/synthtrace infra_hosts_with_processes --live
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra } from '@kbn/synthtrace-client';
import { countBy, times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getNumberOpt } from './helpers/scenario_opts_helpers';

const PROCESSES = [
  {
    commandLine: '/usr/share/elasticsearch/jdk/bin/java -Xms4g -Xmx4g',
    user: 'elasticsearch',
    state: 'running',
    cpu: 0.42,
    memory: 0.31,
  },
  {
    commandLine: '/usr/share/kibana/bin/node /usr/share/kibana/src/cli/dist',
    user: 'kibana',
    state: 'running',
    cpu: 0.18,
    memory: 0.12,
  },
  {
    commandLine: '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main',
    user: 'postgres',
    state: 'sleeping',
    cpu: 0.07,
    memory: 0.08,
  },
  {
    commandLine: 'nginx: worker process',
    user: 'www-data',
    state: 'sleeping',
    cpu: 0.03,
    memory: 0.01,
  },
  { commandLine: '/usr/sbin/cron -f', user: 'root', state: 'idle', cpu: 0, memory: 0.001 },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const scenario: Scenario<InfraDocument> = async ({ scenarioOpts }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 1);
  const stateCounts = countBy(PROCESSES, 'state');

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const hosts = times(numHosts).map((index) => infra.host(`host-with-processes-${index}`));
      const startTime = range.from.getTime() - ONE_DAY_MS;

      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((host) => [
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
            ...PROCESSES.map(({ commandLine, user, state, cpu, memory }, index) =>
              host
                .process({
                  'process.pid': 1000 + index,
                  'process.command_line': commandLine,
                  'user.name': user,
                  'system.process.state': state,
                  'system.process.cpu.total.pct': cpu,
                  'system.process.memory.rss.pct': memory,
                  'system.process.cpu.start_time': startTime,
                })
                .timestamp(timestamp)
            ),
            host
              .processSummary({
                'system.process.summary.total': PROCESSES.length,
                'system.process.summary.running': stateCounts.running ?? 0,
                'system.process.summary.sleeping': stateCounts.sleeping ?? 0,
                'system.process.summary.idle': stateCounts.idle ?? 0,
              })
              .timestamp(timestamp),
          ])
        );

      return withClient(infraEsClient, metrics);
    },
  };
};

export default scenario;
