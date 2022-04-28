/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { MetadataEventsStreamsPlugin } from './plugin';

export const plugin = (context: PluginInitializerContext) =>
  new MetadataEventsStreamsPlugin(context);

export type { MetadataEventsStreamsPluginSetup, MetadataEventsStreamsPluginStart } from './types';

export type { MetadataEventsStream } from './services';
