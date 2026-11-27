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

const configSchema = schema.object({
  // How long initialize() takes, so the doc route visibly waits for it. Above 10s core warns that
  // it is slow.
  initDelayMs: schema.number({ defaultValue: 5000, min: 0 }),
  // When true, initialize() throws. Core logs it and leaves it unhandled, so dev Kibana exits.
  failInitialize: schema.boolean({ defaultValue: false }),
});

export type PluginInitializeExampleConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<PluginInitializeExampleConfig> = {
  schema: configSchema,
};
