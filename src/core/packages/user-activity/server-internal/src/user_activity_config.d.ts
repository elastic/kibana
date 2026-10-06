/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/** Filters applied to user activity events (defaults to none). */
declare const filtersSchema: Type<
  Readonly<
    {} & {
      actions: string[];
      policy: 'drop' | 'keep';
    }
  >[]
>;
/** @internal */
export type UserActivityFiltersType = TypeOf<typeof filtersSchema>;
/**
 * Configuration schema for the User Activity Service.
 * Uses the same appenders schema as the core logging service.
 */
declare const configSchema: import('@kbn/config-schema').ObjectType<{
  enabled: Type<boolean>;
  appenders: Type<
    Map<
      string,
      | Readonly<
          {
            layout?:
              | Readonly<
                  {} & {
                    type: 'json';
                  }
                >
              | Readonly<
                  {
                    highlight?: boolean | undefined;
                    pattern?: string | undefined;
                  } & {
                    type: 'pattern';
                  }
                >
              | undefined;
            attributes?: Record<string, string> | undefined;
            includeResources?: string[] | undefined;
            promoteResourceAttributes?: string[] | undefined;
            ssl?:
              | Readonly<
                  {
                    certificateAuthorities?: string | string[] | undefined;
                    certificate?: string | undefined;
                    key?: string | undefined;
                    keyPassphrase?: string | undefined;
                  } & {
                    verificationMode: 'certificate' | 'full' | 'none';
                    allowPartialTrustChain: boolean;
                  }
                >
              | undefined;
          } & {
            type: 'otel';
            protocol: 'grpc' | 'http' | 'proto';
            url: string;
            headers: Record<string, string>;
            maxQueueSize: number;
            maxElapsedTime: import('moment').Duration;
          }
        >
      | Readonly<
          {} & {
            type: 'console';
            layout:
              | Readonly<
                  {} & {
                    type: 'json';
                  }
                >
              | Readonly<
                  {
                    highlight?: boolean | undefined;
                    pattern?: string | undefined;
                  } & {
                    type: 'pattern';
                  }
                >;
          }
        >
      | Readonly<
          {} & {
            type: 'file';
            layout:
              | Readonly<
                  {} & {
                    type: 'json';
                  }
                >
              | Readonly<
                  {
                    highlight?: boolean | undefined;
                    pattern?: string | undefined;
                  } & {
                    type: 'pattern';
                  }
                >;
            fileName: string;
          }
        >
      | Readonly<
          {} & {
            type: 'rewrite';
            appenders: string[];
            policy: Readonly<
              {} & {
                type: 'meta';
                mode: 'remove' | 'update';
                properties: Readonly<
                  {
                    value?: string | number | boolean | null | undefined;
                  } & {
                    path: string;
                  }
                >[];
              }
            >;
          }
        >
      | Readonly<
          {
            retention?:
              | Readonly<
                  {
                    maxFiles?: number | undefined;
                    maxAccumulatedFileSize?: import('@kbn/config-schema').ByteSizeValue | undefined;
                    removeOlderThan?: import('moment').Duration | undefined;
                  } & {}
                >
              | undefined;
          } & {
            type: 'rolling-file';
            layout:
              | Readonly<
                  {} & {
                    type: 'json';
                  }
                >
              | Readonly<
                  {
                    highlight?: boolean | undefined;
                    pattern?: string | undefined;
                  } & {
                    type: 'pattern';
                  }
                >;
            fileName: string;
            policy:
              | Readonly<
                  {} & {
                    type: 'size-limit';
                    size: import('@kbn/config-schema').ByteSizeValue;
                  }
                >
              | Readonly<
                  {} & {
                    type: 'time-interval';
                    interval: import('moment').Duration;
                    modulate: boolean;
                  }
                >;
            strategy: Readonly<
              {} & {
                type: 'numeric';
                pattern: string;
                max: number;
              }
            >;
          }
        >
    >
  >;
  filters: Type<
    Readonly<
      {} & {
        actions: string[];
        policy: 'drop' | 'keep';
      }
    >[]
  >;
}>;
/** @internal */
export type UserActivityConfigType = TypeOf<typeof configSchema>;
/** @internal */
export declare const config: ServiceConfigDescriptor<UserActivityConfigType>;
export {};
