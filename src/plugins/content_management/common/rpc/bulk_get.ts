/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';
import { GetResult } from './get';

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
