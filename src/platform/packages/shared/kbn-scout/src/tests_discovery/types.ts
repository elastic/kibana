/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Target type for filtering Playwright configs by deployment target
export type TargetType = 'all' | 'mki' | 'ech';

// Valid target types
export const TARGET_TYPES: TargetType[] = ['all', 'mki', 'ech'];

export type DeploymentType =
  | 'classic'
  | 'elasticsearch'
  | 'security'
  | 'observability'
  | 'observability logs-essentials'
  | 'security essentials'
  | 'security ease';

// Module discovery information used in regular CI pipelines with locally run servers
export interface ModuleDiscoveryInfo {
  name: string;
  group: string;
  type: 'plugin' | 'package';
  configs: {
    path: string;
    hasTests: boolean;
    tags: string[];
    serverRunFlags: string[];
    usesParallelWorkers: boolean;
  }[];
}

// Flattened config group used in CI pipelines targeting test runs in Cloud
export interface FlattenedConfigGroup {
  mode: 'serverless' | 'stateful';
  group: string;
  deploymentType: DeploymentType;
  scoutCommand: string; // Full scout command (e.g., "node scripts/scout run-tests --serverless=es --testTarget=cloud")
  configs: string[];
}
