/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import type { DeepPartial } from '@kbn/utility-types';
export declare const validRouteSecurity: (routeSecurity?: DeepPartial<RouteSecurity>) =>
  | Readonly<
      {
        authc?:
          | Readonly<
              {} & {
                enabled: 'minimal' | 'optional' | boolean;
                reason: string;
              }
            >
          | undefined;
      } & {
        authz: Readonly<
          {
            enabled?: false | undefined;
            extendedPrivileges?: any[] | undefined;
          } & {
            requiredPrivileges: (
              | string
              | Readonly<
                  {
                    anyRequired?:
                      | (
                          | string
                          | Readonly<
                              {} & {
                                allOf: string[];
                              }
                            >
                        )[]
                      | undefined;
                    allRequired?:
                      | (
                          | string
                          | Readonly<
                              {} & {
                                anyOf: string[];
                              }
                            >
                        )[]
                      | undefined;
                  } & {}
                >
            )[];
            reason: string;
          }
        >;
      }
    >
  | undefined;
