/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BarrelIndex } from '@kbn/babel-plugin-transform-barrels';

export type { BarrelIndex, BarrelFileEntry, ExportInfo } from '@kbn/babel-plugin-transform-barrels';

export interface TransformConfig {
  disableSourceMaps?: boolean;
  repoRoot?: string;
  barrelIndex?: BarrelIndex;
}

export interface WorkerData {
  config: TransformConfig;
  barrelIndex?: BarrelIndex;
}

export interface WorkerTask {
  path: string;
  source: string;
}

export interface WorkerResult {
  code: string;
  map?: unknown;
}

export type Transform = (path: string, source: string) => Promise<WorkerResult>;
