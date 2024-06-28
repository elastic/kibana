/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { offeringBasedSchema, schema } from '@kbn/config-schema';

export type { CreateSAMLResponseParams } from './plugin';
export { plugin } from './plugin';

export const config = {
  schema: schema.object({
    // The plugin should only be enabled in Serverless.
    enabled: offeringBasedSchema({
      serverless: schema.boolean({ defaultValue: true }),
      options: { defaultValue: false },
    }),
  }),
};
