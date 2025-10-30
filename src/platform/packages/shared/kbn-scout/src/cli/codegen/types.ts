/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CliSupportedServerModes } from '../../types';

export interface CodegenOptions {
  esFrom: 'serverless' | 'source' | 'snapshot' | undefined;
  installDir: string | undefined;
  logsDir: string | undefined;
  mode: CliSupportedServerModes;
  outputFileName: string;
  parallel: boolean;
  pluginPath: string;
  startUrl?: string | undefined;
  role: string;
  testDirectory: string;
}

export interface TransformOptions {
  deploymentTags: string[];
  role: string;
  scoutPackage: string;
  useSpaceTest: boolean;
}

export interface SelectorMapping {
  cssSelector: string;
  testSubj: string;
}

export interface TransformResult {
  code: string;
  detectedPatterns: string[];
  warnings: string[];
}
