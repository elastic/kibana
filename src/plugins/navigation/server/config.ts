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
    enabled: schema.boolean({ defaultValue: false }),
    defaultSolution: schema.oneOf(
      [
        schema.literal('es'),
        schema.literal('oblt'),
        schema.literal('security'),
        schema.literal('analytics'),
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
