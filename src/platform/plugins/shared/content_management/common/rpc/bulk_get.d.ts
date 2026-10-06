/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { GetResult } from './get';
export declare const bulkGetSchemas: {
  in: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    version: import('@kbn/config-schema').Type<number>;
    ids: import('@kbn/config-schema').Type<string[]>;
    options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
  out: import('@kbn/config-schema').ObjectType<{
    hits: import('@kbn/config-schema').Type<
      Readonly<
        {} & {
          contentTypeId: string;
          result: Readonly<
            {
              meta?: Readonly<{} & {}> | undefined;
            } & {
              item: Readonly<{} & {}>;
            }
          >;
        }
      >[]
    >;
    meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
};
export interface BulkGetIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  ids: string[];
  version?: Version;
  options?: Options;
}
export type BulkGetResult<T = unknown, ItemMeta = void, ResultMeta = void> = ResultMeta extends void
  ? {
      hits: Array<GetResult<T, ItemMeta>>;
    }
  : {
      hits: Array<GetResult<T, ItemMeta>>;
      meta: ResultMeta;
    };
