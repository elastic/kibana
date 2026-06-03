/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const asCodeMetaSchema: import('@kbn/config-schema').ObjectType<{
  created_at: import('@kbn/config-schema').Type<string | undefined>;
  created_by: import('@kbn/config-schema').Type<string | undefined>;
  managed: import('@kbn/config-schema').Type<boolean | undefined>;
  owner: import('@kbn/config-schema').Type<string | undefined>;
  updated_at: import('@kbn/config-schema').Type<string | undefined>;
  updated_by: import('@kbn/config-schema').Type<string | undefined>;
  version: import('@kbn/config-schema').Type<string | undefined>;
}>;
export type AsCodeMeta = TypeOf<typeof asCodeMetaSchema>;
