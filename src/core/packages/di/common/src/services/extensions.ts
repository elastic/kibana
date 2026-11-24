/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExtensionPoint } from '../extension_point';
import { createToken } from '../token';

/**
 * Resolves the values plugins contributed to extension points, without a plugin dependency on them.
 * @public
 */
export interface ExtensionService {
  /**
   * The only contribution to the extension point, or undefined when no enabled plugin contributes to it.
   * Throws when more than one contribution exists, and until all plugins started,
   * so call it in an `OnExtensionsReady` hook, a request handler, or later.
   * @param point The extension point.
   */
  get<T>(point: ExtensionPoint<T>): T | undefined;

  /**
   * Every contribution to the extension point across all enabled plugins (empty when none).
   * Throws when a contribution fails to build, and until all plugins started,
   * so call it in an `OnExtensionsReady` hook, a request handler, or later.
   * @param point The extension point.
   */
  getAll<T>(point: ExtensionPoint<T>): T[];
}

/**
 * Extension service.
 * @public
 */
export const ExtensionService = createToken<ExtensionService>('ExtensionService');
