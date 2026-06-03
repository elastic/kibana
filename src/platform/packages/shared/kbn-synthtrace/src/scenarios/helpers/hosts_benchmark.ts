/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { Serializable } from '@kbn/synthtrace-client';
import { hashStr, mulberry32 } from '../../lib/service_graph_logs/placeholders/rng';
import type { InfraSynthtraceEsClient } from '../../lib/infra/infra_synthtrace_es_client';
import { getNumberOpt } from './scenario_opts_helpers';

export const DEFAULT_HOST_COUNT = 1500;

// Bench-friendly sampling intervals (production scrapes at 1m/30s). At the
// Hosts UI's `now-24h` range the chart layer re-aggregates to ~30m–1h buckets,
// so anything denser than 5m is wasted: 5m yields ~432k docs vs ~2.16M at 1m
// for 1500 hosts, same cardinality and window, far faster to seed.
export const BENCH_SEMCONV_INTERVAL = '5m';
export const BENCH_ECS_INTERVAL = '5m';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function getHostCount(scenarioOpts: Record<string, unknown> | undefined): number {
  return getNumberOpt(scenarioOpts, 'hosts', DEFAULT_HOST_COUNT);
}

export function formatHostName(hostIndex: number): string {
  return `host-${String(hostIndex + 1).padStart(4, '0')}`;
}

export function deriveHostSeed(scenarioName: string, hostIndex: number): number {
  return hashStr(`${scenarioName}:${hostIndex}`);
}

export function createHostRng(scenarioName: string, hostIndex: number): () => number {
  return mulberry32(deriveHostSeed(scenarioName, hostIndex));
}

function rangeFloat(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function computeLookBackTime(fromMs: number, toMs: number): string {
  const windowMs = Math.max(toMs - fromMs, 0);
  const lookBackMs = windowMs + ONE_HOUR_MS;
  const hours = Math.ceil(lookBackMs / ONE_HOUR_MS);
  return `${hours}h`;
}

export function configureTsdsOtelTemplate(
  infraEsClient: InfraSynthtraceEsClient,
  fromMs: number,
  toMs: number
): void {
  infraEsClient.setOtelDataStreamTemplateOptions({
    tsds: true,
    lookBackTime: computeLookBackTime(fromMs, toMs),
  });
}

export function configureNonTsdsOtelTemplate(infraEsClient: InfraSynthtraceEsClient): void {
  infraEsClient.setOtelDataStreamTemplateOptions({ tsds: false });
}

function semconvBaseFields(hostName: string) {
  return {
    'agent.id': `agent-${hostName}`,
    'host.hostname': hostName,
    'host.name': hostName,
    'host.os.name': 'linux',
    'host.ip': '122.122.122.122',
    'cloud.provider': 'aws',
    'cloud.region': 'us-east-1',
    'resource.attributes.host.name': hostName,
    'resource.attributes.os.type': 'linux',
    'data_stream.dataset': 'hostmetricsreceiver.otel',
    'data_stream.type': 'metrics',
    'data_stream.namespace': 'default',
  };
}

export function generateSemconvHostMetricsAtTimestamp(
  scenarioName: string,
  hostIndex: number,
  hostName: string,
  timestamp: number,
  options?: { staggerMs?: boolean }
): Array<Serializable<InfraDocument>> {
  const rng = createHostRng(scenarioName, hostIndex);
  const base = semconvBaseFields(hostName);

  const cpuIdle = rangeFloat(rng, 0.2, 0.95);
  const cpuWait = rangeFloat(rng, 0, 0.1);
  const cpuUser = rangeFloat(rng, 0, 0.3);
  const cpuSystem = rangeFloat(rng, 0, 0.2);
  const loadAvg1m = rangeFloat(rng, 0.05, 2.5);
  const logicalCount = 4 + Math.floor(rangeFloat(rng, 0, 12));

  const totalMemory = 16 * 1024 * 1024 * 1024;
  const memoryUsedPct = rangeFloat(rng, 0.3, 0.9);
  const usedMemory = totalMemory * memoryUsedPct;
  const freeMemory = totalMemory - usedMemory;

  const totalDisk = 100 * 1024 * 1024 * 1024;
  const diskUsedPct = rangeFloat(rng, 0.3, 0.7);
  const usedDisk = totalDisk * diskUsedPct;
  const freeDisk = totalDisk - usedDisk;

  const cpuDocs = [
    { state: 'idle', utilization: cpuIdle },
    { state: 'wait', utilization: cpuWait },
    { state: 'user', utilization: cpuUser },
    { state: 'system', utilization: cpuSystem },
  ].map(({ state, utilization }) => ({
    ...base,
    state,
    'metricset.name': 'cpu',
    'system.cpu.utilization': utilization,
    'metrics.system.cpu.utilization': utilization,
    'system.cpu.logical.count': logicalCount,
    'metrics.system.cpu.logical.count': logicalCount,
    'system.cpu.load_average.1m': loadAvg1m,
    'metrics.system.cpu.load_average.1m': loadAvg1m,
  }));

  const memDocs = [
    { state: 'used', utilization: memoryUsedPct, usage: usedMemory },
    { state: 'free', utilization: freeMemory / totalMemory, usage: freeMemory },
  ].map(({ state, utilization, usage }) => ({
    ...base,
    state,
    'metricset.name': 'memory',
    'system.memory.utilization': utilization,
    'system.memory.usage': usage,
  }));

  const diskDocs = [
    { state: 'used', usage: usedDisk },
    { state: 'free', usage: freeDisk },
  ].map(({ state, usage }) => ({
    ...base,
    state,
    'metricset.name': 'filesystem',
    'system.filesystem.usage': usage,
    'metrics.system.filesystem.usage': usage,
  }));

  const docs = [...cpuDocs, ...memDocs, ...diskDocs];

  return docs.map((doc, index) => {
    const docTimestamp = options?.staggerMs ? timestamp + index : timestamp;
    return new Serializable<InfraDocument>({
      ...doc,
      '@timestamp': docTimestamp,
    } as InfraDocument);
  });
}

function ecsBaseFields(hostName: string, hostIndex: number) {
  return {
    'event.module': 'system',
    'agent.id': 'synthtrace',
    'host.hostname': hostName,
    'host.name': hostName,
    'host.ip': `10.${Math.floor(hostIndex / 256)}.${hostIndex % 256}.1`,
    'host.os.name': 'Linux',
    'host.os.platform': 'ubuntu',
    'host.os.version': '4.19.76-linuxkit',
    'cloud.provider': 'gcp',
    'metricset.period': 10000,
  };
}

export function generateEcsHostMetricsAtTimestamp(
  scenarioName: string,
  hostIndex: number,
  timestamp: number
): Array<Serializable<InfraDocument>> {
  const rng = createHostRng(scenarioName, hostIndex);
  const hostName = formatHostName(hostIndex);
  const base = ecsBaseFields(hostName, hostIndex);

  const cpuPct = rangeFloat(rng, 0.05, 0.95);
  const memoryUsedPct = rangeFloat(rng, 0.3, 0.9);
  const filesystemUsedPct = rangeFloat(rng, 0.1, 0.9);
  const load1 = rangeFloat(rng, 0.05, 2.5);
  const loadCores = 4 + Math.floor(rangeFloat(rng, 0, 12));
  const memoryTotal = 64 * 1024 * 1024 * 1024;
  const memoryUsedBytes = memoryTotal * memoryUsedPct;
  const memoryFreeBytes = memoryTotal - memoryUsedBytes;

  return [
    new Serializable<InfraDocument>({
      ...base,
      'metricset.name': 'cpu',
      'system.cpu.total.norm.pct': cpuPct,
      'system.cpu.user.pct': cpuPct * 0.6,
      'system.cpu.system.pct': cpuPct * 0.3,
      'system.cpu.cores': loadCores,
      'process.cpu.pct': cpuPct * 0.1,
      'system.cpu.nice.pct': 0.05,
      '@timestamp': timestamp,
    } as InfraDocument),
    new Serializable<InfraDocument>({
      ...base,
      'metricset.name': 'memory',
      'system.memory.actual.used.pct': memoryUsedPct,
      'system.memory.actual.used.bytes': memoryUsedBytes,
      'system.memory.actual.free': memoryFreeBytes,
      'system.memory.total': memoryTotal,
      'system.memory.used.pct': memoryUsedPct,
      'system.memory.used.bytes': memoryUsedBytes,
      'process.memory.pct': memoryUsedPct * 0.1,
      '@timestamp': timestamp,
    } as InfraDocument),
    new Serializable<InfraDocument>({
      ...base,
      'metricset.name': 'load',
      'system.load': {
        1: load1,
        cores: loadCores,
      },
      '@timestamp': timestamp,
    } as InfraDocument),
    new Serializable<InfraDocument>({
      ...base,
      'metricset.name': 'filesystem',
      'system.filesystem.used.pct': filesystemUsedPct,
      '@timestamp': timestamp,
    } as InfraDocument),
  ];
}

export function getDeterministicApmThroughput(scenarioName: string, hostIndex: number): number {
  const rng = createHostRng(scenarioName, hostIndex);
  return 1 + Math.floor(rng() * 3);
}

export function getDeterministicApmDurationMs(
  scenarioName: string,
  hostIndex: number
): { parentDuration: number; childDuration: number } {
  const rng = createHostRng(scenarioName, hostIndex);
  const high = rng() > 0.5;
  const parentDuration = high ? 1000 + Math.floor(rng() * 4000) : 100 + Math.floor(rng() * 900);
  const childDuration = Math.max(50, parentDuration - 100);
  return { parentDuration, childDuration };
}
