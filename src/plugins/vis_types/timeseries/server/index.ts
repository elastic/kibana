/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { VisTypeTimeseriesConfig, config as configSchema } from '../config';

export type { VisTypeTimeseriesSetup } from './plugin';

export const config: PluginConfigDescriptor<VisTypeTimeseriesConfig> = {
  // exposeToBrowser specifies kibana.yml settings to expose to the browser
  // the value `true` in this context signals configuration is exposed to browser
  exposeToBrowser: {
    readOnly: true,
  },
  schema: configSchema,
};

export async function plugin(initializerContext: PluginInitializerContext) {
  const { VisTypeTimeseriesPlugin } = await import('./plugin');
  return new VisTypeTimeseriesPlugin(initializerContext);
}

export type { TimeseriesVisData } from '../common/types';
export { isVisSeriesData, isVisTableData } from '../common/vis_data_utils';
