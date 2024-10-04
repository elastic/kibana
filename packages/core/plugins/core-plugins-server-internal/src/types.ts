/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';

/** @internal */
export interface PluginDependencies {
  /**
   * Plugin to dependencies map with plugin names as key/values.
   *
   * Keys sorted by plugin topological order (root plugins first, leaf plugins last).
   */
  asNames: ReadonlyMap<PluginName, PluginName[]>;
  /**
   * Plugin to dependencies map with plugin opaque ids as key/values.
   *
   * Keys sorted by plugin topological order (root plugins first, leaf plugins last).
   */
  asOpaqueIds: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>;
}
