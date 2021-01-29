/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'src/core/server';
import { DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S } from '../common/constants';

export const configSchema = schema.object({
  uiCounters: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    debug: schema.boolean({ defaultValue: schema.contextRef('dev') }),
  }),
  maximumWaitTimeForAllCollectorsInS: schema.number({
    defaultValue: DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S,
  }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('ui_metric.enabled', 'usageCollection.uiCounters.enabled'),
    renameFromRoot('ui_metric.debug', 'usageCollection.uiCounters.debug'),
    renameFromRoot('usageCollection.uiMetric.enabled', 'usageCollection.uiCounters.enabled'),
    renameFromRoot('usageCollection.uiMetric.debug', 'usageCollection.uiCounters.debug'),
  ],
  exposeToBrowser: {
    uiCounters: true,
  },
};
