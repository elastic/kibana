/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CpuProfileNode {
  id: number;
  callFrame: Record<string, unknown>;
  children?: number[];
  parent?: number;
  [extra: string]: unknown;
}

export interface CpuProfile {
  nodes: CpuProfileNode[];
  samples: number[];
  timeDeltas: number[];
  startTime?: number;
  endTime?: number;
  title?: string;
  [extra: string]: unknown;
}
