/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
/**
 * Get the path of kibana.yml
 * @internal
 */
export declare const getConfigPath: () => string;
/**
 * Get the directory containing configuration files
 * @internal
 */
export declare const getConfigDirectory: () => string;
/**
 * Get the directory containing runtime data
 * @internal
 */
export declare const getDataPath: () => string;
/**
 * Get the directory containing logs
 * @internal
 */
export declare const getLogsPath: () => string;
export type PathConfigType = TypeOf<typeof config.schema>;
export declare const config: {
  path: string;
  schema: import('@kbn/config-schema').ObjectType<{
    data: import('@kbn/config-schema').Type<string>;
  }>;
};
