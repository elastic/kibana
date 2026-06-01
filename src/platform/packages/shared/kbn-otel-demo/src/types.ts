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
export type DemoType =
  | 'otel-demo'
  | 'online-boutique'
  | 'bank-of-anthos'
  | 'quarkus-super-heroes'
  | 'aws-retail-store'
  | 'rust-k8s-demo';

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
  /** Override the default container command */
  command?: string[];
  /** Arguments to pass to the command */
  args?: string[];
  /** Init containers to run before the main container */
  initContainers?: Array<{
    name: string;
    image: string;
    command?: string[];
    args?: string[];
    volumeMounts?: Array<{ name: string; mountPath: string }>;
  }>;
  /** Volumes to mount in the pod */
  volumes?: Array<{
    name: string;
    emptyDir?: Record<string, never>;
    configMap?: { name: string };
  }>;
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
  /**
   * If true, this demo requires custom-built container images that are not available
   * in public registries. Users must build and push images before deploying.
   */
  requiresCustomImages?: boolean;
  /** Instructions for building custom images when requiresCustomImages is true */
  customImageInstructions?: string;
  /** Configuration for automatic image building when requiresCustomImages is true */
  imageBuildConfig?: {
    gitUrl: string;
    images: Array<{
      name: string;
      context: string;
      dockerfile?: string;
    }>;
    preBuildCommand?: string;
  };
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
  /** Host aliases to inject into the collector pod for DNS resolution from inside pods */
  hostAliases?: Array<{ ip: string; hostnames: string[] }>;
  /** OTel Collector container image — always set by ensure_otel_demo (EDOT by default, vanilla with --vanilla) */
  collectorImage?: string;
}

/**
 * Interface for demo-specific manifest generators
 */
export interface DemoManifestGenerator {
  generate(options: ManifestOptions): string;
}
