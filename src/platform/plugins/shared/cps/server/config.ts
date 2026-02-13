/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  /**
   * @deprecated Use "elasticsearch.cpsEnabled" in kibana.yml instead. This setting will be removed in a future version.
   */
  cpsEnabled: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: false }),
  }),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const cpsCpsEnabled = get(settings, 'cps.cpsEnabled');
      if (cpsCpsEnabled !== undefined) {
        addDeprecation({
          configPath: 'cps.cpsEnabled',
          title: 'Setting "cps.cpsEnabled" is deprecated',
          message:
            '"cps.cpsEnabled" has been moved to "elasticsearch.cpsEnabled". Please update your kibana.yml to use the new setting.',
          level: 'critical',
          correctiveActions: {
            manualSteps: [
              'Replace "cps.cpsEnabled" with "elasticsearch.cpsEnabled" in your Kibana config.',
            ],
          },
        });
      }
    },
  ],
};

export type CPSConfig = TypeOf<typeof configSchema>;
