/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentConfigOptions } from 'elastic-apm-node';
import type { ApmConfiguration } from './config';
/**
 * Load the APM configuration.
 *
 * @param argv the `process.argv` arguments
 * @param rootDir The root directory of kibana (where the sources and the `package.json` file are)
 * @param isDistributable true for production builds, false otherwise
 */
export declare const loadConfiguration: (
  argv: string[],
  rootDir: string,
  isDistributable: boolean
) => ApmConfiguration;
export declare const getConfiguration: (serviceName: string) => AgentConfigOptions | undefined;
