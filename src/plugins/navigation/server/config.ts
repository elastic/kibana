/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  solutionNavigation: schema.object({
    featureOn: schema.boolean({ defaultValue: false }),
    enabled: schema.boolean({ defaultValue: false }),
    optInStatus: schema.oneOf(
      [schema.literal('visible'), schema.literal('hidden'), schema.literal('ask')],
      { defaultValue: 'ask' }
    ),
    defaultSolution: schema.oneOf(
      [
        schema.literal('ask'),
        schema.literal('es'),
        schema.literal('oblt'),
        schema.literal('security'),
      ],
      { defaultValue: 'es' }
    ),
  }),
});

export type NavigationConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NavigationConfig> = {
  exposeToBrowser: {
    solutionNavigation: true,
  },
  schema: configSchema,
};
