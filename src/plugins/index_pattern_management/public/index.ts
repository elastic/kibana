/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Management Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces in `plugin.ts`. The remaining items exported here are
 * either types, or static code.
 */
import { PluginInitializerContext } from 'src/core/public';
import { IndexPatternManagementPlugin } from './plugin';
export type { IndexPatternManagementSetup, IndexPatternManagementStart } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new IndexPatternManagementPlugin(initializerContext);
}
