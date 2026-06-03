/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const asCodeQuerySchema: import('@kbn/config-schema').ObjectType<{
  expression: import('@kbn/config-schema').Type<string>;
  language: import('@kbn/config-schema').Type<'kql' | 'lucene'>;
}>;
export type AsCodeQuery = TypeOf<typeof asCodeQuerySchema>;
