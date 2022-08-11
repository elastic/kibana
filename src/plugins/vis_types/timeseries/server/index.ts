/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { VisTypeTimeseriesConfig, config as configSchema } from './config';
import { VisTypeTimeseriesPlugin } from './plugin';

export type { VisTypeTimeseriesSetup } from './plugin';

export const config: PluginConfigDescriptor<VisTypeTimeseriesConfig> = {
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisTypeTimeseriesPlugin(initializerContext);
}

export type { TimeseriesVisData } from '../common/types';
export { isVisSeriesData, isVisTableData } from '../common/vis_data_utils';
