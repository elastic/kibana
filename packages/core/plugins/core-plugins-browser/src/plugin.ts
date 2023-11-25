/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { CoreStart, CoreSetup } from '@kbn/core-lifecycle-browser';

/**
 * The interface that should be returned by a `PluginInitializer`.
 *
 * @public
 */
export interface Plugin<
  TSetup = void,
  TStart = void,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  setup(core: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;

  start(core: CoreStart, plugins: TPluginsStart): TStart;

  stop?(): MaybePromise<void>;
}
