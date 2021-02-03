/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';
import { CoreSetup } from 'src/core/server';
import { regionmapConfigSchema } from '../../maps_legacy/config';
import { getUiSettings } from './ui_settings';

export type RegionmapConfig = TypeOf<typeof regionmapConfigSchema>;

export const config: PluginConfigDescriptor<RegionmapConfig> = {
  exposeToBrowser: {
    includeElasticMapsService: true,
    layers: true,
  },
  schema: regionmapConfigSchema,
};

export const plugin = () => ({
  setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettings());
  },

  start() {},
});
