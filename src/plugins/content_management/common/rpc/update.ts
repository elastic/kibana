/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';
import type { ItemResult } from './types';

export interface UpdateIn<
  T extends string = string,
  Data extends object = object,
  Options extends void | object = object
> {
  contentTypeId: T;
  id: string;
  data: Data;
  version?: Version;
  options?: Options;
}

export type UpdateResult<T = unknown, M = void> = ItemResult<T, M>;
