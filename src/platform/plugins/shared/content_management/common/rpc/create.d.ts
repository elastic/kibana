/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { ItemResult } from './types';
export declare const createSchemas: {
  in: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    version: import('@kbn/config-schema').Type<number>;
    data: import('@kbn/config-schema').Type<Record<string, any>>;
    options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
  out: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    result: import('@kbn/config-schema').ObjectType<{
      item: import('@kbn/config-schema').ObjectType<{}>;
      meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
    }>;
  }>;
};
export interface CreateIn<
  T extends string = string,
  Data extends object = object,
  Options extends void | object = object
> {
  contentTypeId: T;
  data: Data;
  version?: Version;
  options?: Options;
}
export type CreateResult<T = unknown, M = void> = ItemResult<T, M>;
