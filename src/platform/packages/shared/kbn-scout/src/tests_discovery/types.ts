/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Target type for filtering Playwright configs by deployment target
import type { ScoutTargetArch, ScoutTargetDomain } from '@kbn/scout-info';

export type TargetType = 'all' | 'local' | 'local-stateful-only' | 'mki' | 'ech';

// Valid target types
export const TARGET_TYPES: TargetType[] = ['all', 'local', 'local-stateful-only', 'mki', 'ech'];

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
  testTarget: {
    arch: ScoutTargetArch;
    domain: ScoutTargetDomain;
  };
  group: string;
  scoutCommand: string; // Full scout command (e.g., "node scripts/scout run-tests --location cloud --arch serverless --domain search")
  configs: string[];
}
