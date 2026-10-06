/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
export declare const deleteSchemas: {
  in: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    id: import('@kbn/config-schema').Type<string>;
    version: import('@kbn/config-schema').Type<number>;
    options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
  out: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    result: import('@kbn/config-schema').ObjectType<{
      success: import('@kbn/config-schema').Type<boolean>;
    }>;
  }>;
};
export interface DeleteIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  id: string;
  version?: Version;
  options?: Options;
}
export interface DeleteResult {
  success: boolean;
}
