/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export declare const configSchema: import('@kbn/config-schema').ObjectType<{
  usageCounters: import('@kbn/config-schema').ObjectType<{
    enabled: import('@kbn/config-schema').Type<boolean>;
    retryCount: import('@kbn/config-schema').Type<number>;
    bufferDuration: import('@kbn/config-schema').Type<import('moment').Duration>;
  }>;
  uiCounters: import('@kbn/config-schema').ObjectType<{
    enabled: import('@kbn/config-schema').Type<boolean>;
    debug: import('@kbn/config-schema').Type<boolean>;
  }>;
  maximumWaitTimeForAllCollectorsInS: import('@kbn/config-schema').Type<number>;
  maxCollectorConcurrency: import('@kbn/config-schema').Type<number>;
}>;
export type ConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<ConfigType>;
