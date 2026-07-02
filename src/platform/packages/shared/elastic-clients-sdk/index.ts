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

export type { JsonSchemaObject } from './lib/json_schema';

export { apiRegistries, UnknownApiError } from './registry';
export type {
  ApiTarget,
  ApiRegistry,
  ApiRegistryMeta,
  ApiRegistryDefinition,
  ApiRequest,
  LoadedApi,
  ApiHttpMethod,
} from './registry';

/**
 * Zod schema for {@link ApiTarget}.
 *
 * Use this as the `target` field in any tool schema that accepts an API target.
 */
export const targetSchema = z
  .enum(['elasticsearch', 'kibana'])
  .describe(
    'The backend API target. Use "elasticsearch" to call Elasticsearch HTTP APIs and "kibana" to call Kibana HTTP APIs. '
  );
