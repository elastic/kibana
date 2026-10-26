/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  InfraCache,
  InfraDatabase,
  InfraMessageQueue,
  InfraDependency,
  OS_OPTIONS,
  Protocols,
  Runtime,
} from './constants';
export type { InfraDependency, Runtime, Protocols } from './constants';

export interface LogsManifest {
  services: Array<{
    name: string;
    displayName?: string;
    runtime: Runtime;
    infraDeps: InfraDependency[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    protocol: Protocols;
  }>;
  activeInfraDeps: InfraDependency[];
}

export interface ServiceNode {
  name: string;
  /** Overrides `service.name` in emitted docs; defaults to `name`. */
  displayName?: string;
  runtime: Runtime;
  version: string;
  infraDeps: InfraDependency[];
  role?: string;
  deployment?: ServiceDeployment;
  /** Optional per-service log templates that override the shared corpus. */
  serviceLogs?: ServiceLogTemplates;
  /**
   * When true, downstream failures are absorbed (graceful degradation / circuit breaker).
   * When false or absent, any downstream sync failure cascades up.
   */
  resilient?: boolean;
}

export interface ServiceEdge {
  source: string;
  target: string;
  protocol: Protocols;
}

export interface ServiceGraph<TName extends string = string> {
  services: Array<ServiceNode & { name: TName }>;
  edges: ServiceEdge[];
}
export type ServiceNamesOf<T extends ServiceGraph> = T['services'][number]['name'];
export type ServiceDependenciesOf<T extends ServiceGraph> =
  T['services'][number]['infraDeps'][number];
export interface ServiceDeployment {
  k8s?: {
    namespace: string;
  };
  container?: {
    name: string;
  };
  os?: {
    type?: (typeof OS_OPTIONS)[number]['type'];
    name?: (typeof OS_OPTIONS)[number]['name'];
    version?: (typeof OS_OPTIONS)[number]['version'];
  };
}

export type { InfraCategory } from './constants';

export type ServiceErrorType = 'db_timeout' | 'internal_error' | 'bad_gateway' | 'gateway_timeout';

export interface ServiceLogTemplates {
  /** Per-service success templates for this service's runtime. */
  success?: string[];
  /** Per-service error templates; override the shared error corpus for this service. */
  error?: string[];
}

/** Error types that originate from the infra/platform layer rather than service logic. */
export type InfraErrorType =
  | 'k8s_oom'
  | 'k8s_crash_loop_backoff'
  | 'message_queue_failure'
  | 'cache_failure';

const INFRA_ERROR_TYPES: readonly InfraErrorType[] = [
  'k8s_oom',
  'k8s_crash_loop_backoff',
  'message_queue_failure',
  'cache_failure',
];

export type ErrorType = ServiceErrorType | InfraErrorType;

/** Returns true when the error type originates from the infra/platform layer (e.g. pod crash). */
export const isInfraErrorType = (e: ErrorType): e is InfraErrorType =>
  (INFRA_ERROR_TYPES as readonly string[]).includes(e);

/** Canonical HTTP status code for each error type. */
export const ERROR_TYPE_STATUS: Record<ErrorType, number> = {
  gateway_timeout: 504,
  bad_gateway: 502,
  db_timeout: 503,
  k8s_crash_loop_backoff: 503,
  k8s_oom: 503,
  message_queue_failure: 503,
  cache_failure: 503,
  internal_error: 500,
};

export type NoiseHealthState = 'healthy' | 'degraded';

export interface ConditionPool {
  warn: string[];
  error: string[];
}

export type RuntimeMessagePool = Partial<Record<Runtime, ConditionPool>>;

export interface TechPool<TInfra, TApp> {
  infra: TInfra;
  app: TApp;
}

export type InfraPool<TConditions extends string = never> = { healthy: string[] } & Record<
  TConditions,
  ConditionPool
>;

export type AppPool<TConditions extends string = never> = {
  success: Partial<Record<Runtime, string[]>>;
} & Record<TConditions, RuntimeMessagePool>;

export interface ServiceMessages {
  internal_error: RuntimeMessagePool;
  db_timeout: Record<InfraDatabase, RuntimeMessagePool>;
  bad_gateway: RuntimeMessagePool;
  gateway_timeout: RuntimeMessagePool;
  k8s_oom: RuntimeMessagePool;
  k8s_crash_loop_backoff: RuntimeMessagePool;
}

export interface SuccessCorpus {
  always: Partial<Record<Runtime, string[]>>;
  database: Partial<Record<Runtime, Record<InfraDatabase, string[]>>>;
  cache: Partial<Record<Runtime, Record<InfraCache, string[]>>>;
  messageQueue: Partial<Record<Runtime, Record<InfraMessageQueue, string[]>>>;
}

export interface ServiceFailure {
  errorType: ErrorType;
  /** Probability 0–1 that a request triggers this error on any given tick. */
  rate: number;
  /** Number of error log documents emitted when the failure is triggered. Defaults to 1. */
  multiplier?: number;
  /** Infra dep that caused this failure; set by resolveServiceFailures. */
  sourceDep?: InfraDependency;
}

/** Infra dep failures cascade to every service that lists that dep. */
export interface FailureMap<
  TServiceName extends string = string,
  TDepName extends string = string
> {
  services?: Partial<Record<TServiceName, ServiceFailure>>;
  infra?: Partial<Record<TDepName, ServiceFailure>>;
}

export type FailuresOrFn<TServiceName extends string = string, TDepName extends string = string> =
  | FailureMap<TServiceName, TDepName>
  | ((timestamp: number) => FailureMap<TServiceName, TDepName> | undefined);

/** A burst or silence window applied to a log channel. */
export interface ChannelSpike {
  /** Absolute timestamp (ms since epoch). Omit for a permanent spike. */
  start?: number;
  /** Absolute timestamp (ms since epoch). Omit for open-ended. */
  end?: number;
  /** 0 = silence, 1 = normal, N = N× burst. */
  scale: number;
  /** Scope this spike to specific service names only. */
  services?: string[];
}

/** Per-channel volume shaping: rate (base doc multiplier), cadence, and spike windows. */
export interface ChannelEntry {
  /**
   * Base doc weight per tick (default `1`).
   * Entry service: scales the DFS trace multiplier.
   * Other services / infra deps: extra docs per tick. Use `0` to suppress while keeping the key.
   */
  rate?: number;
  /** Emit only on every N-th tick. Defaults to 1 (every tick). */
  every?: number;
  /** Burst/silence windows. First matching spike wins. */
  spikes?: ChannelSpike[];
}

/** Per-service/dep volume shaping map. Only the keys you provide are affected. */
export type ChannelVolume<TName extends string> = Partial<Record<TName, ChannelEntry>>;

/** Volume shaping for the noise (background chatter) channel. */
export interface NoiseVolumeConfig {
  /** Base noise doc count per tick. Defaults to topology size (service count). */
  rate?: number | ((ts: number) => number);
  /** Emit only on every N-th tick. Defaults to 1. */
  every?: number;
  /** Burst/silence windows. First matching spike wins. */
  spikes?: ChannelSpike[];
  /** Fractional jitter ± applied to the resolved count. Defaults to 0.5. */
  jitter?: number;
}

/** Noise (background chatter) channel configuration: GC logs, health checks, connection pool. */
export interface NoiseConfig {
  /** Volume shaping. Defaults to topology-sized rate with 0.5 jitter. */
  volume?: NoiseVolumeConfig;
  /** Ghost-mention docs (references to technologies not in any service's infraDeps). */
  ghostMentions?: Array<{
    message: string;
    rate?: number;
  }>;
}

/** Full configuration for `buildLogsGenerator`. */
export interface LogsGeneratorConfig<TServiceGraph extends ServiceGraph = ServiceGraph> {
  /** Tick window in ms. */
  tickIntervalMs: number;
  /** Service topology. */
  serviceGraph: TServiceGraph;
  /** Entry service for the DFS request trace. Defaults to the first service. */
  entryService?: ServiceNamesOf<TServiceGraph>;
  /** What is broken: per-service and per-infra-dep failure configs. */
  failures?: FailuresOrFn<ServiceNamesOf<TServiceGraph>, ServiceDependenciesOf<TServiceGraph>>;
  /** How many docs: per-service/dep volume shaping (rate, cadence, spike windows). */
  volume?: ChannelVolume<ServiceNamesOf<TServiceGraph> | ServiceDependenciesOf<TServiceGraph>>;
  /** Background chatter channel. Omit to disable. */
  noise?: NoiseConfig;
  /** RNG seed for deterministic output. */
  seed?: number;
  /** Spread docs within a tick across this many ms. */
  tickSpreadMs?: number;
  /** When set, volume spike timestamps wrap modulo this duration (live-mode cycling). */
  cycleMs?: number;
  /** Absolute timestamp that corresponds to offset 0 of the cycle. */
  cycleOriginMs?: number;
}
