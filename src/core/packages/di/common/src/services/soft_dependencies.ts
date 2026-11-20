/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import { createToken } from '../token';

/**
 * Resolves services exposed by other plugins without declaring a plugin dependency on them.
 * @public
 */
export interface SoftDependencies {
  /**
   * The service another plugin exposed, or undefined when no enabled plugin exposes it.
   * Throws before all plugins finished setup.
   * @param serviceIdentifier The exposed service identifier.
   */
  get<T>(serviceIdentifier: ServiceIdentifier<T>): T | undefined;

  /**
   * Every binding exposed for the token across all enabled plugins (empty when none).
   * Throws before all plugins finished setup.
   * @param serviceIdentifier The exposed service identifier.
   */
  getAll<T>(serviceIdentifier: ServiceIdentifier<T>): T[];
}

/**
 * Soft dependencies service.
 * @public
 */
export const SoftDependencies = createToken<SoftDependencies>('SoftDependencies');
