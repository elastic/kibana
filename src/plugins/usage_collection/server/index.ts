/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'src/core/server';
import { UsageCollectionPlugin } from './plugin';

export {
  AllowedSchemaTypes,
  MakeSchemaFrom,
  SchemaField,
  CollectorOptions,
  UsageCollectorOptions,
  Collector,
  CollectorFetchContext,
} from './collector';

export { UsageCollectionSetup } from './plugin';
export { config } from './config';
export const plugin = (initializerContext: PluginInitializerContext) =>
  new UsageCollectionPlugin(initializerContext);
