/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { CustomIntegrationsPlugin } = await import('./plugin');
  return new CustomIntegrationsPlugin(initializerContext);
}

export type { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';

export type { IntegrationCategory, CustomIntegration } from '../common';

export const config = {
  schema: schema.object({}),
};
