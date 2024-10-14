/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TelemetryRC } from '../config';
import { ErrorReporter } from './error_reporter';
import { ParsedUsageCollection } from '../ts_parser';
export interface TelemetryRoot {
  config: TelemetryRC;
  parsedCollections?: ParsedUsageCollection[];
  mapping?: any;
  esMappingDiffs?: string[];
}

export interface TaskContext {
  reporter: ErrorReporter;
  roots: TelemetryRoot[];
}

export function createTaskContext(): TaskContext {
  const reporter = new ErrorReporter();
  return {
    roots: [],
    reporter,
  };
}
