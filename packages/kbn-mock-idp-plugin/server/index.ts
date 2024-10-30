/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { offeringBasedSchema, schema } from '@kbn/config-schema';

export type { CreateSAMLResponseParams } from './plugin';
export { plugin } from './plugin';

export const config = {
  schema: schema.object({
    // The plugin should only be enabled in Serverless.
    enabled: offeringBasedSchema({
      serverless: schema.boolean({ defaultValue: true }),
      traditional: schema.boolean({ defaultValue: false }),
      options: { defaultValue: false },
    }),
  }),
};
