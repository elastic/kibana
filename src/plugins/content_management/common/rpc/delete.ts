/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';

export interface DeleteIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  id: string;
  version?: Version;
  options?: Options;
}

export interface DeleteResult {
  success: boolean;
}
