/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Extracts logs from Docker nodes, writes them to files, and returns the file paths.
 */
export declare function extractAndArchiveLogs({
  outputFolder,
  log,
  nodeNames,
}: {
  log: ToolingLog;
  nodeNames?: string[];
  outputFolder?: string;
}): Promise<string[] | undefined>;
