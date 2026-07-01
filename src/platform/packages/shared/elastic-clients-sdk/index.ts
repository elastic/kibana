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

export type { JsonSchemaObject } from './lib/json_schema';

export { extractSchemaArgs } from './lib/schema_args';
export type { SchemaArgDefinition, FoundIn } from './lib/schema_args';

export { esApiRegistry, kbApiRegistry } from './registry';
export type {
  ApiRegistry,
  ApiRegistryMeta,
  ApiRegistryDefinition,
  ApiRequest,
  LoadedApi,
  ApiHttpMethod,
} from './registry';
