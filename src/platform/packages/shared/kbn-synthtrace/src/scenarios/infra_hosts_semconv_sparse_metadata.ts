/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields, InfraDocument } from '@kbn/synthtrace-client';
import { Serializable } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';

/**
 * Generates semconv (OTel hostmetricsreceiver) host metrics where metadata
 * fields (`host.os.name`, `cloud.provider`, `host.ip`) are deliberately
 * incomplete on a fraction of the most recent samples. Designed to lock the
 * "most-complete data possible" invariant that the metadata aggregation in
 * `getAllHosts` is expected to preserve:
 *
 *   1. Sparse-metadata hosts: the last `sparseFraction` of the time window
 *      emits docs WITHOUT `host.os.name` / `cloud.provider` / `host.ip`. A
 *      naive "latest doc" lookup returns null; the correct answer is the
 *      value seen in the earlier samples. This is the case described in
 *      [REPORT.md] "Still pending → Metadata-completeness empirical check".
 *
 *   2. Migrated-metadata hosts: every Nth host changes `cloud.provider` and
 *      `host.os.name` halfway through the window. A "most-frequent" lookup
 *      (which is what plain `terms(size: 1)` returns) gives whichever value
 *      had more docs; the correct answer for the table is the *latest*
 *      value. This locks the regression that the original
 *      `filter:{exists} > top_metrics(sort:@timestamp desc, size:1)` shape
 *      avoided and that the revised P3 shape
 *      (`terms(size:1, order: { latest_ts: desc }) > max(@timestamp)`) is
 *      meant to preserve.
 *
 * Scenario options:
 *   --scenarioOpts.numHosts=10         (default 10)
 *   --scenarioOpts.sparseFraction=0.3  (last 30 % of the window has no metadata)
 *   --scenarioOpts.migrationRatio=0.2  (1 in N hosts migrates cloud + OS mid-window)
 */

interface SparseSemconvHostFields extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'host.os.name'?: string;
  'host.ip'?: string;
  'cloud.provider'?: string;
  'cloud.region'?: string;
  'resource.attributes.host.name'?: string;
  'resource.attributes.os.type'?: string;
  'data_stream.dataset': string;
  'data_stream.type': string;
  'data_stream.namespace': string;
  'metricset.name'?: string;
  state?: string;
  direction?: string;
  'metrics.system.cpu.utilization'?: number;
  'metrics.system.cpu.logical.count'?: number;
  'metrics.system.cpu.load_average.1m'?: number;
  'system.memory.utilization'?: number;
  'system.memory.usage'?: number;
  'metrics.system.filesystem.usage'?: number;
  'metrics.system.network.io'?: number;
  'device.keyword'?: string;
}

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 10);
  const sparseFraction = getNumberOpt(scenarioOpts, 'sparseFraction', 0.3);
  const migrationRatio = getNumberOpt(scenarioOpts, 'migrationRatio', 0.2);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const fromMs = range.from.getTime();
      const toMs = range.to.getTime();
      const totalMs = toMs - fromMs;
      const sparseStartMs = toMs - totalMs * sparseFraction;
      const migrationCutoffMs = fromMs + totalMs / 2;

      const hosts = times(numHosts).map((index) => {
        const name = `semconv-host-${index}`;
        const willMigrate =
          migrationRatio > 0 && index % Math.max(1, Math.round(1 / migrationRatio)) === 0;
        return { name, willMigrate };
      });

      const baseFor = (
        timestamp: number,
        host: { name: string; willMigrate: boolean }
      ): SparseSemconvHostFields => {
        const isSparseWindow = timestamp >= sparseStartMs;
        const cloudProvider = host.willMigrate && timestamp >= migrationCutoffMs ? 'gcp' : 'aws';
        const osName = host.willMigrate && timestamp >= migrationCutoffMs ? 'rhel' : 'ubuntu';
        const hostIp =
          host.willMigrate && timestamp >= migrationCutoffMs ? '10.0.0.42' : '122.122.122.122';

        const base: SparseSemconvHostFields = {
          'agent.id': `agent-${host.name}`,
          'host.hostname': host.name,
          'host.name': host.name,
          'resource.attributes.host.name': host.name,
          'data_stream.dataset': 'hostmetricsreceiver.otel',
          'data_stream.type': 'metrics',
          'data_stream.namespace': 'default',
          '@timestamp': timestamp,
        };

        if (!isSparseWindow) {
          base['host.os.name'] = osName;
          base['host.ip'] = hostIp;
          base['cloud.provider'] = cloudProvider;
          base['cloud.region'] = 'us-east-1';
          base['resource.attributes.os.type'] = osName;
        }

        return base;
      };

      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((host) => {
            const base = baseFor(timestamp, host);

            const cpuDocs = [
              { state: 'idle', value: 0.3 + Math.random() * 0.4 },
              { state: 'wait', value: Math.random() * 0.1 },
              { state: 'user', value: Math.random() * 0.3 },
              { state: 'system', value: Math.random() * 0.2 },
            ].map(({ state, value }, i) => ({
              ...base,
              '@timestamp': timestamp + i,
              state,
              'metricset.name': 'cpu',
              'metrics.system.cpu.utilization': value,
              'metrics.system.cpu.logical.count': 4,
              'metrics.system.cpu.load_average.1m': 1 + Math.random() * 3,
            }));

            const totalMem = 16 * 1024 * 1024 * 1024;
            const usedMem = totalMem * (0.4 + Math.random() * 0.3);
            const memDocs = [
              { state: 'used', utilization: usedMem / totalMem, usage: usedMem },
              {
                state: 'free',
                utilization: (totalMem - usedMem) / totalMem,
                usage: totalMem - usedMem,
              },
            ].map(({ state, utilization, usage }, i) => ({
              ...base,
              '@timestamp': timestamp + 10 + i,
              state,
              'metricset.name': 'memory',
              'system.memory.utilization': utilization,
              'system.memory.usage': usage,
            }));

            const fsDocs = [
              { state: 'used', usage: 30 * 1024 * 1024 * 1024 },
              { state: 'free', usage: 70 * 1024 * 1024 * 1024 },
            ].map(({ state, usage }, i) => ({
              ...base,
              '@timestamp': timestamp + 20 + i,
              state,
              'metricset.name': 'filesystem',
              'metrics.system.filesystem.usage': usage,
            }));

            const netDocs = [
              { direction: 'transmit', io: Math.floor(Math.random() * 1e9) },
              { direction: 'receive', io: Math.floor(Math.random() * 1e9) },
            ].map(({ direction, io }, i) => ({
              ...base,
              '@timestamp': timestamp + 25 + i,
              direction,
              'metricset.name': 'network',
              'device.keyword': 'eth0',
              'metrics.system.network.io': io,
            }));

            return [...cpuDocs, ...memDocs, ...fsDocs, ...netDocs].map(
              (doc) => new Serializable(doc)
            );
          })
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_semconv_hosts_sparse_metadata', () => metrics)
      );
    },
  };
};

export default scenario;
