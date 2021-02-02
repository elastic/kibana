/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';
import { tilemapConfigSchema } from '../../maps_legacy/config';

export type TilemapConfig = TypeOf<typeof tilemapConfigSchema>;

export const config: PluginConfigDescriptor<TilemapConfig> = {
  exposeToBrowser: {
    url: true,
    options: true,
  },
  schema: tilemapConfigSchema,
};

export const plugin = () => ({
  setup() {},
  start() {},
});
