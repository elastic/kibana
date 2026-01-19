/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

// -------------------------------
// >= 8.x
// -------------------------------
const schemaLatest = schema.object(
  {
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      embeddedEnabled: schema.boolean({ defaultValue: true }),
    }),
    autocompleteDefinitions: schema.object({
      // Only displays the endpoints that are available in the specified environment
      endpointsAvailability: schema.oneOf([schema.literal('stack'), schema.literal('serverless')], {
        defaultValue: 'stack',
      }),
    }),
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<ConsoleConfig> = {
  exposeToBrowser: {
    ui: true,
    autocompleteDefinitions: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type ConsoleConfig = TypeOf<typeof schemaLatest>;

export const config: PluginConfigDescriptor<ConsoleConfig> = configLatest;
