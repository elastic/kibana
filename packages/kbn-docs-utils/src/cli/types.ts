/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transaction } from 'elastic-apm-node';
import type { Project } from 'ts-morph';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  PluginOrPackage,
  PluginApi,
  MissingApiItemMap,
  ReferencedDeprecationsByPlugin,
  UnreferencedDeprecationsByPlugin,
  AdoptionTrackedAPIsByPlugin,
  ApiStats,
  PluginMetaInfo,
} from '../types';
import type { EslintDisableCounts } from '../count_eslint_disable';
import type { EnzymeImportCounts } from '../count_enzyme_imports';

/**
 * Parsed CLI flags from the command line.
 */
export interface CliFlags {
  /** Whether to collect references for API items. */
  references?: boolean;
  /** Stats flags: 'any', 'comments', and/or 'exports'. */
  stats?: string | string[];
  /** Plugin filter: single plugin ID or array of plugin IDs. */
  plugin?: string | string[];
}

/**
 * Validated and normalized CLI options.
 */
export interface CliOptions {
  /** Whether to collect references for API items. */
  collectReferences: boolean;
  /** Stats flags to display. */
  stats?: string[];
  /** Plugin filter IDs. */
  pluginFilter?: string[];
}

/**
 * Context shared across CLI tasks.
 */
export interface CliContext {
  /** Tooling log instance. */
  log: ToolingLog;
  /** APM transaction for tracking. */
  transaction: Transaction;
  /** Output folder for generated documentation. */
  outputFolder: string;
  /** Initial document IDs (for cleanup). */
  initialDocIds?: string[];
}

/**
 * Result from setup_project task.
 */
export interface SetupProjectResult {
  /** Discovered plugins and packages. */
  plugins: PluginOrPackage[];
  /** File paths grouped by package. */
  pathsByPlugin: Map<PluginOrPackage, string[]>;
  /** TypeScript project instance. */
  project: Project;
  /** Initial document IDs for cleanup (if output folder existed). */
  initialDocIds?: string[];
}

/**
 * Result from build_api_map task.
 */
export interface BuildApiMapResult {
  /** Plugin API map. */
  pluginApiMap: { [key: string]: PluginApi };
  /** Missing API items. */
  missingApiItems: MissingApiItemMap;
  /** Referenced deprecations. */
  referencedDeprecations: ReferencedDeprecationsByPlugin;
  /** Unreferenced deprecations. */
  unreferencedDeprecations: UnreferencedDeprecationsByPlugin;
  /** Adoption-tracked APIs. */
  adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin;
}

/**
 * Combined plugin stats including API stats, ESLint counts, and Enzyme counts.
 */
export type PluginStats = PluginMetaInfo & ApiStats & EslintDisableCounts & EnzymeImportCounts;

/**
 * All plugin stats keyed by plugin ID.
 */
export interface AllPluginStats {
  [key: string]: PluginStats;
}
