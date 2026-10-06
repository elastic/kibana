/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { DeepPartial, MaybePromise } from '@kbn/utility-types';
import type { CustomOperationObject } from './type';
export declare function mergeOperation(
  pathToSpecOrSpec: string | MaybePromise<DeepPartial<OpenAPIV3.OperationObject>>,
  operation: CustomOperationObject
): Promise<void>;
