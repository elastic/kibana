/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { z } from 'zod/v4';

export * from 'zod/v4';

// Export fromJSONSchema polyfill separately
// Temporary polyfill until Kibana upgrades to Zod v4+ where z.fromJSONSchema will be available natively.
// When upgrading, consumers can change:
//   import { z, fromJSONSchema } from '@kbn/zod/v4';
//   fromJSONSchema(schema);
// To:
//   import { z } from '@kbn/zod/v4';
//   z.fromJSONSchema(schema);
export { fromJSONSchema } from './from_json_schema';
