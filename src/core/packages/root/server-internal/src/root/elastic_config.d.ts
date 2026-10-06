/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const elasticConfig: import('@kbn/config-schema').ObjectType<{
  apm: import('@kbn/config-schema').ObjectType<
    Omit<
      {
        active: import('@kbn/config-schema').Type<boolean | undefined>;
        serverUrl: import('@kbn/config-schema').Type<string | undefined>;
        secretToken: import('@kbn/config-schema').Type<string | undefined>;
        apiKey: import('@kbn/config-schema').Type<string | undefined>;
        environment: import('@kbn/config-schema').Type<string | undefined>;
        globalLabels: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
      },
      'redactUsers' | 'servicesOverrides'
    > & {
      servicesOverrides: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {
                active?: boolean | undefined;
                serverUrl?: string | undefined;
                secretToken?: string | undefined;
                apiKey?: string | undefined;
                environment?: string | undefined;
                globalLabels?: Readonly<{} & {}> | undefined;
              } & {}
            >
          >
        | undefined
      >;
      redactUsers: import('@kbn/config-schema').Type<boolean | undefined>;
    }
  >;
}>;
export type ElasticConfigType = TypeOf<typeof elasticConfig>;
export declare const elasticApmConfig: ServiceConfigDescriptor<ElasticConfigType>;
export {};
