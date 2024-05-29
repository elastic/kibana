/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';

/** @internal */
export interface InternalCoreDiServiceSetup {
  /**
   * Loads a scoped module that will be loaded for each plugin.
   */
  load(id: PluginOpaqueId, module: interfaces.ContainerModule): void;
}

/** @internal */
export interface InternalCoreDiServiceStart {
  root: interfaces.Container;

  getContainer(id: PluginOpaqueId, root?: interfaces.Container): interfaces.Container | undefined;

  fork(root?: interfaces.Container): interfaces.Container;
}
