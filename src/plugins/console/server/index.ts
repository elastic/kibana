/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/server';

import { ConsoleServerPlugin } from './plugin';

export { ConsoleSetup, ConsoleStart } from './types';

export { config } from './config';

export const plugin = (ctx: PluginInitializerContext) => new ConsoleServerPlugin(ctx);
