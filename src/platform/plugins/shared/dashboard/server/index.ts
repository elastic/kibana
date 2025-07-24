/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * this config is unused, but cannot be removed as removing a yml setting is a breaking change.
   * This can be removed in 10.0. https://github.com/elastic/kibana/issues/221197
   */
  allowByValueEmbeddables: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
  deprecations: ({ deprecate }) => {
    return [
      deprecate('allowByValueEmbeddables', '9.1.0', {
        level: 'warning',
        message: `This setting is deprecated and ignored by the system. Please remove this setting.`,
      }),
    ];
  },
};

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { DashboardPlugin } = await import('./plugin');
  return new DashboardPlugin(initializerContext);
}

export type { DashboardPluginSetup, DashboardPluginStart } from './types';
export type {
  DashboardAttributes,
  DashboardPanel,
  DashboardSection,
  DashboardSearchOut,
  DashboardFilter,
  DashboardQuery,
} from './content_management';
export type { DashboardSavedObjectAttributes, SavedDashboardPanel } from './dashboard_saved_object';

export { PUBLIC_API_PATH } from './api/constants';
