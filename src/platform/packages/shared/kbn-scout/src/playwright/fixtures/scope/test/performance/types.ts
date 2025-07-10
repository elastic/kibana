/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface BundleInfo {
  url: string;
  name: string;
  plugin: string;
  transferredSize: number;
  headersSize: number;
}

export interface PluginInfo {
  count: number;
  totalSize: number;
  bundles: Array<{ name: string; transferredSize: number }>;
}

export interface PageInfo {
  bundleCount: number;
  totalSize: number;
  pluginCount: number;
  plugins: Array<{
    name: string;
    bundlesCount: number;
    totalSize: number;
    bundles: Array<{ name: string; transferredSize: number }>;
  }>;
}

export interface PerformanceMetrics {
  jsHeapUsedSize?: number;
  jsHeapTotalSize?: number;
  cpuTime?: number;
  scriptTime?: number;
  layoutTime?: number;
  fps?: number;
  nodesCount?: number;
  documentsCount?: number;
  layoutCount?: number;
  styleRecalcCount?: number;
}
