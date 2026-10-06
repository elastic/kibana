/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Type, type TypeOf } from '@kbn/config-schema';
import type { ServiceStatusLevelId, StatusResponse } from '@kbn/core-status-common';
declare const redactedStatusResponse: () => import('@kbn/config-schema').ObjectType<{
  status: import('@kbn/config-schema').ObjectType<{
    overall: import('@kbn/config-schema').ObjectType<{
      level: Type<ServiceStatusLevelId>;
    }>;
  }>;
}>;
/** Lazily load this schema */
export declare const statusResponse: () => Type<
  | Omit<StatusResponse, 'metrics'>
  | Readonly<
      {} & {
        status: Readonly<
          {} & {
            overall: Readonly<
              {} & {
                level: ServiceStatusLevelId;
              }
            >;
          }
        >;
      }
    >
>;
export type RedactedStatusHttpBody = TypeOf<typeof redactedStatusResponse>;
export {};
