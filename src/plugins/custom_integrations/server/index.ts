/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { PluginInitializerContext } from '@kbn/core/server';
import { CustomIntegrationsPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new CustomIntegrationsPlugin(initializerContext);
}

export type { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';

export type { IntegrationCategory, CustomIntegration } from '../common';

export const config = {
  schema: schema.object({}),
};
