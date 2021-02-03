/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigDeprecationProvider } from '@kbn/config';

export type KibanaConfigType = TypeOf<typeof config.schema>;

const deprecations: ConfigDeprecationProvider = () => [
  (settings, fromPath, log) => {
    const kibana = settings[fromPath];
    if (kibana?.index) {
      log(
        `"kibana.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`
      );
    }
    return settings;
  },
];

export const config = {
  path: 'kibana',
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: '.kibana' }),
    autocompleteTerminateAfter: schema.duration({ defaultValue: 100000 }),
    autocompleteTimeout: schema.duration({ defaultValue: 1000 }),
  }),
  deprecations,
};
