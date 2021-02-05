/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { CoreSetup } from 'src/core/server';
import { configSchema, ConfigSchema } from '../config';
import { getUiSettings } from './ui_settings';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    includeElasticMapsService: true,
    layers: true,
  },
  schema: configSchema,
};

export const plugin = () => ({
  setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettings());
  },

  start() {},
});
