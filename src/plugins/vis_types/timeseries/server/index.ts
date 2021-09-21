/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { VisTypeTimeseriesConfig, config as configSchema } from './config';
import { VisTypeTimeseriesPlugin } from './plugin';

export { VisTypeTimeseriesSetup } from './plugin';

export const config: PluginConfigDescriptor<VisTypeTimeseriesConfig> = {
  deprecations: ({ unused, renameFromRoot }) => [
    // In Kibana v7.8 plugin id was renamed from 'metrics' to 'vis_type_timeseries':
    renameFromRoot('metrics.enabled', 'vis_type_timeseries.enabled', { silent: true }),
    renameFromRoot('metrics.chartResolution', 'vis_type_timeseries.chartResolution', {
      silent: true,
    }),
    renameFromRoot('metrics.minimumBucketSize', 'vis_type_timeseries.minimumBucketSize', {
      silent: true,
    }),

    // Unused properties which should be removed after releasing Kibana v8.0:
    unused('chartResolution'),
    unused('minimumBucketSize'),
  ],
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisTypeTimeseriesPlugin(initializerContext);
}

export { TimeseriesVisData } from '../common/types';
export { isVisSeriesData, isVisTableData } from '../common/vis_data_utils';
