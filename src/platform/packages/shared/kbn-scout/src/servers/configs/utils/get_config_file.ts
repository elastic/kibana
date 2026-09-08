/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { ScoutTestTarget } from '@kbn/scout-info';

/**
 * Gets the config file path from a config root directory and mode.
 * @param configRootDir The root directory for the config (e.g., 'default/serverless', 'custom/uiam_local/stateful')
 * @param testTarget The test target definition (based on location, architecture and domain)
 * @returns The full path to the config file
 */
export function getConfigFilePath(configRootDir: string, testTarget: ScoutTestTarget): string {
  return path.join(configRootDir, [testTarget.domain, testTarget.arch, 'config.ts'].join('.'));
}
