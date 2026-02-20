/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Supported demo environment types
 */
export type DemoType = 'otel-demo' | 'online-boutique';

/**
 * Service configuration for a microservice in the demo
 */
export interface ServiceConfig {
  name: string;
  image: string;
  port?: number;
  env?: Record<string, string>;
  resources?: {
    requests?: { memory?: string; cpu?: string };
    limits?: { memory?: string; cpu?: string };
  };
  volumeMounts?: Array<{ name: string; mountPath: string }>;
}

/**
 * Configuration for a demo environment
 */
export interface DemoConfig {
  /** Unique identifier for the demo */
  id: DemoType;
  /** Human-readable display name */
  displayName: string;
  /** Kubernetes namespace for deployment */
  namespace: string;
  /** Description of the demo */
  description: string;
  /** Default version to deploy */
  defaultVersion: string;
  /** Available versions for this demo */
  availableVersions: string[];
  /** Frontend service configuration for external access */
  frontendService?: {
    name: string;
    nodePort: number;
  };
  /** Function that returns service configurations for a specific version */
  getServices: (version?: string) => ServiceConfig[];
}

/**
 * Failure scenario step configuration
 */
export interface FailureScenarioStep {
  type: 'env';
  service: string;
  variable: string;
  value: string;
  description: string;
}

/**
 * Failure scenario definition
 */
export interface FailureScenario {
  id: string;
  name: string;
  description: string;
  category: 'dramatic' | 'subtle';
  steps: FailureScenarioStep[];
  recovery: FailureScenarioStep[];
}

/**
 * Options for generating Kubernetes manifests
 */
export interface ManifestOptions {
  config: DemoConfig;
  version: string;
  elasticsearchEndpoint: string;
  username: string;
  password: string;
  logsIndex: string;
  collectorConfigYaml: string;
  /** Per-service environment variable overrides from failure scenarios */
  envOverrides?: Record<string, Record<string, string>>;
}

/**
 * Interface for demo-specific manifest generators
 */
export interface DemoManifestGenerator {
  generate(options: ManifestOptions): string;
}
