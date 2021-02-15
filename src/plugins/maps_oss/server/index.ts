/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { copyFromRoot } from '@kbn/config';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  deprecations: () => [copyFromRoot('xpack.maps.enabled', 'maps_oss.enabled')],
};

export const plugin = () => ({
  setup() {},
  start() {},
});
