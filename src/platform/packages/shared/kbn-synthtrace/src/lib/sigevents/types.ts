/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDependency, OS_OPTIONS, Protocols, Runtime } from './constants';
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
  | 'k8s_crash_loop_back'
  | 'message_queue_failure'
  | 'cache_failure';

export type ErrorType = ServiceErrorType | InfraErrorType;

/** Returns true when the error type originates from the infra/platform layer (e.g. pod crash). */
export function isInfraErrorType(e: ErrorType): e is InfraErrorType {
  return (
    e === 'k8s_oom' ||
    e === 'k8s_crash_loop_back' ||
    e === 'message_queue_failure' ||
    e === 'cache_failure'
  );
}

/** Canonical HTTP status code for each error type. */
export const ERROR_TYPE_STATUS: Record<ErrorType, number> = {
  gateway_timeout: 504,
  bad_gateway: 502,
  db_timeout: 503,
  k8s_crash_loop_back: 503,
  k8s_oom: 503,
  message_queue_failure: 503,
  cache_failure: 503,
  internal_error: 500,
};

export type NoiseHealthState = 'healthy' | 'degraded';

export interface GeneratorOptions {
  seed?: number;
  timestamp?: number;
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

/**
 * Describes what is broken. Services and infra deps are resolved independently:
 * infra dep failures cascade to every service that lists that dep.
 */
export interface FailureMap<
  TServiceName extends string = string,
  TDepName extends string = string
> {
  services?: Partial<Record<TServiceName, ServiceFailure>>;
  infra?: Partial<Record<TDepName, ServiceFailure>>;
}
