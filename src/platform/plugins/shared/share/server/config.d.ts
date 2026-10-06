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
  new_version: import('@kbn/config-schema').ObjectType<{
    enabled: import('@kbn/config-schema').Type<boolean>;
  }>;
  url_expiration: import('@kbn/config-schema').ObjectType<{
    enabled: import('@kbn/config-schema').Type<boolean>;
    duration: import('@kbn/config-schema').Type<import('moment').Duration>;
    check_interval: import('@kbn/config-schema').Type<import('moment').Duration>;
    url_limit: import('@kbn/config-schema').Type<number>;
  }>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
