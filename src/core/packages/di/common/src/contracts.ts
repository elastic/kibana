/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';

/**
 * Public setup contract of the DI service.
 * @public
 */
export interface CoreDiServiceSetup {
  /**
   * Load the plugin module, registering the internal services and exposing the global ones.
   */
  load(module: interfaces.ContainerModule): void;
}

/**
 * Public start contract of the DI service.
 * @public
 */
export interface CoreDiServiceStart {
  /**
   * The plugin-scoped container
   */
  getContainer(root?: interfaces.Container): interfaces.Container | undefined;
}
