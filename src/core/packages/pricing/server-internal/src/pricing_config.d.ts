/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const pricingConfig: {
  path: string;
  schema: import('@kbn/config-schema').ObjectType<{
    tiers: import('@kbn/config-schema').ObjectType<{
      enabled: import('@kbn/config-schema').ConditionalType<true, boolean, boolean>;
      products: import('@kbn/config-schema').Type<
        | (
            | Readonly<
                {} & {
                  name: 'observability';
                  tier: 'complete' | 'logs_essentials';
                }
              >
            | Readonly<
                {} & {
                  name: 'ai_soc';
                  tier: 'search_ai_lake';
                }
              >
            | Readonly<
                {} & {
                  name: 'security';
                  tier: 'complete' | 'essentials' | 'search_ai_lake';
                }
              >
            | Readonly<
                {} & {
                  name: 'endpoint';
                  tier: 'complete' | 'essentials' | 'search_ai_lake';
                }
              >
            | Readonly<
                {} & {
                  name: 'cloud';
                  tier: 'complete' | 'essentials' | 'search_ai_lake';
                }
              >
          )[]
        | undefined
      >;
    }>;
  }>;
};
export type PricingConfigType = TypeOf<typeof pricingConfig.schema>;
