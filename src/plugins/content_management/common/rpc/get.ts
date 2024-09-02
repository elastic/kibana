/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';
import type { ItemResult } from './types';

export interface GetIn<T extends string = string, Options extends void | object = object> {
  id: string;
  contentTypeId: T;
  version?: Version;
  options?: Options;
}

export type GetResult<T = unknown, M = void> = ItemResult<T, M>;
