/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { ConfigSchema } from '../config';
import { VegaPlugin as Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new Plugin(initializerContext);
}

// Bundled shared exports
// Exported this way so the code doesn't end up in the page load bundle
/** @internal */
export const getVegaSharedImports = async () => {
  return await import('./shared');
};

type Await<T> = T extends PromiseLike<infer U> ? U : T;
export type GetVegaSharedImports = Await<ReturnType<typeof getVegaSharedImports>>;
