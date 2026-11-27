/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a mix of infrastructure host metrics and APM data from services running on those hosts.
 * Hosts with system metrics also report process metrics, shown in the Processes tab of the host
 * details flyout. That tab only shows the last minute of data, so run with `--live` for it.
 */

import type { InfraDocument, Instance, ApmFields } from '@kbn/synthtrace-client';
import { apm, infra } from '@kbn/synthtrace-client';
import { countBy, random, times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

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
const PROCESS_STATE_COUNTS = countBy(PROCESSES, 'state');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const scenario: Scenario<InfraDocument | ApmFields> = async ({ logger, scenarioOpts, from }) => {
  const numInstances = getNumberOpt(scenarioOpts, 'numInstances', 10);
  const processStartTime = from - ONE_DAY_MS;

  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      const transactionName = 'GET /host/{id}';

      // Only half of the hosts will have system metrics
      const hostList = times(numInstances / 2).map((index) => infra.host(`host-${index}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hostList.flatMap((host) => [
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
                  'system.process.cpu.start_time': processStartTime,
                })
                .timestamp(timestamp)
            ),
            host
              .processSummary({
                'system.process.summary.total': PROCESSES.length,
                'system.process.summary.running': PROCESS_STATE_COUNTS.running ?? 0,
                'system.process.summary.sleeping': PROCESS_STATE_COUNTS.sleeping ?? 0,
                'system.process.summary.idle': PROCESS_STATE_COUNTS.idle ?? 0,
              })
              .timestamp(timestamp),
          ])
        );

      // APM Simple Trace
      const instances = times(numInstances).map((index) => {
        return apm
          .service({
            name: `synth-node-${index}`,
            environment: ENVIRONMENT,
            agentName: 'node-js',
          })
          .instance(`host-${index}`);
      });

      const instanceSpans = (instance: Instance) => {
        const hasHighDuration = Math.random() > 0.5;
        const throughput = random(1, 10);

        const traces = range.ratePerMinute(throughput).generator((timestamp) => {
          const parentDuration = hasHighDuration ? random(1000, 5000) : random(100, 1000);
          return instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(parentDuration)
            .success();
        });

        const cpuPct = random(0, 1);
        const memoryFree = random(0, 1000);
        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': memoryFree,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': cpuPct,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [traces, metricsets];
      };

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_hosts', () => hosts)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            instances.flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
