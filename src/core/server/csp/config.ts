/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';

/**
 * @internal
 */
export type CspConfigType = TypeOf<typeof config.schema>;

export const config = {
  // TODO: Move this to server.csp using config deprecations
  // ? https://github.com/elastic/kibana/pull/52251
  path: 'csp',
  schema: schema.object({
    rules: schema.arrayOf(schema.string(), {
      defaultValue: [
        `script-src 'unsafe-eval' 'self'`,
        `worker-src blob: 'self'`,
        `style-src 'unsafe-inline' 'self'`,
      ],
    }),
    strict: schema.boolean({ defaultValue: true }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: true }),
  }),
};
