/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ConfigSchema, configSchema } from '../common/config';

export type {
  SharePublicSetup as SharePluginSetup,
  SharePublicStart as SharePluginStart,
} from './plugin';

export { CSV_QUOTE_VALUES_SETTING, CSV_SEPARATOR_SETTING } from '../common/constants';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SharePlugin } = await import('./plugin');
  return new SharePlugin(initializerContext);
}

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    new_version: { enabled: true },
  },
  schema: configSchema,
};
