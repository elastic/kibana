/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { DeepPartial } from '@kbn/utility-types';
import { dereference } from '@apidevtools/json-schema-ref-parser';
import deepMerge from 'deepmerge';
import type { CustomOperationObject } from './type';

export async function mergeOperation(
  pathToSpecOrSpec: string | DeepPartial<OpenAPIV3.OperationObject>,
  operation: CustomOperationObject
) {
  if (typeof pathToSpecOrSpec === 'string') {
    Object.assign(operation, deepMerge(operation, await dereference(pathToSpecOrSpec)));
  } else {
    Object.assign(operation, deepMerge(operation, pathToSpecOrSpec));
  }
}
