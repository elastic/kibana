/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from '@kbn/zod/v4';

export function resolveInput (
 input: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>)
): z.ZodObject<z.ZodRawShape> {
 return typeof input === 'function' ? input() : input
}

export { extractSchemaArgs } from './lib/schema-args';
export type { SchemaArgDefinition, FoundIn } from './lib/schema-args';

export { esApiRegistry, kbApiRegistry } from './api/registry';
export type {
  ApiRegistry,
  ApiRegistryMeta,
  ApiRegistryDefinition,
  ApiRequest,
  LoadedApi,
  ApiHttpMethod,
} from './api/registry';
