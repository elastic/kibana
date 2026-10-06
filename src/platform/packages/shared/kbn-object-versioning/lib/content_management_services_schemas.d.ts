/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
export declare const serviceDefinitionSchema: import('@kbn/config-schema').ObjectType<{
  get: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  bulkGet: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  create: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  update: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  delete: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  search: Type<
    | Readonly<
        {
          in?: any;
          out?: any;
        } & {}
      >
    | undefined
  >;
  mSearch: Type<
    | Readonly<
        {
          out?:
            | Readonly<
                {
                  result?:
                    | Readonly<
                        {
                          schema?: any;
                          down?: any;
                          up?: any;
                        } & {}
                      >
                    | undefined;
                } & {}
              >
            | undefined;
        } & {}
      >
    | undefined
  >;
}>;
