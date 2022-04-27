/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { DEFAULT_MAXIMUM_WAIT_TIME_FOR_ALL_COLLECTORS_IN_S } from '../common/constants';

export const configSchema = schema.object({
  usageCounters: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    retryCount: schema.number({ defaultValue: 1 }),
    bufferDuration: schema.duration({ defaultValue: '5s' }),
  }),
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
  exposeToBrowser: {
    uiCounters: true,
  },
  exposeToUsage: {
    usageCounters: {
      bufferDuration: true,
    },
  },
};
