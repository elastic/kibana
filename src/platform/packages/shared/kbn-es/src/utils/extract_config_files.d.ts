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
 * Copies config references to an absolute path to
 * the provided destination. This is necessary as ES security
 * requires files to be within the installation directory
 */
export declare function extractConfigFiles(
  config: string | string[],
  dest: string,
  options?: {
    log: ToolingLog;
  }
): string[];
export declare function isFile(dest?: string): boolean;
export declare function copyFileSync(src: string, dest: string): void;
