/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import('@kbn/config-schema').ObjectType<{
  autocomplete: import('@kbn/config-schema').ObjectType<{
    querySuggestions: import('@kbn/config-schema').ObjectType<{
      enabled: import('@kbn/config-schema').Type<boolean>;
    }>;
    valueSuggestions: import('@kbn/config-schema').ObjectType<{
      enabled: import('@kbn/config-schema').Type<boolean>;
      tiers: import('@kbn/config-schema').Type<string[]>;
      terminateAfter: import('@kbn/config-schema').Type<import('moment').Duration>;
      timeout: import('@kbn/config-schema').Type<import('moment').Duration>;
    }>;
  }>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
