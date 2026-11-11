/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Lets a plugin wait for its own initialization.
 * See {@link PluginInitializerContext.initialization}.
 *
 * @public
 */
export interface PluginInitialization {
  /**
   * Resolves once this plugin's `initialize()` has finished and rejects when it fails. Calls made
   * before it runs, including during `start()`, wait for it. For a plugin without `initialize()`,
   * resolves once every plugin has started.
   */
  initialize(): Promise<void>;
}
