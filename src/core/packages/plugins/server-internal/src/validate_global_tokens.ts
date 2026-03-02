/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import type { Logger } from '@kbn/logging';
import type { PluginWrapper } from './plugin';

/**
 * Cross-references every plugin's `globals.consumes` tokens against the set of
 * `globals.provides` tokens from all enabled plugins.
 *
 * Call after all plugins have completed `start()`.
 */
export const validateGlobalTokens = (
  plugins: ReadonlyMap<PluginName, PluginWrapper>,
  mode: 'warn' | 'error',
  log: Logger
): void => {
  const publishedTokens = new Set<string>();
  for (const plugin of plugins.values()) {
    for (const token of plugin.manifest.globals.provides) {
      publishedTokens.add(token);
    }
  }

  const violations: Array<{ pluginName: string; token: string; expectedPublisher: string }> = [];

  for (const [pluginName, plugin] of plugins) {
    for (const token of plugin.manifest.globals.consumes) {
      if (!publishedTokens.has(token)) {
        const expectedPublisher = token.split('.')[0] ?? 'unknown';
        violations.push({ pluginName, token, expectedPublisher });
      }
    }
  }

  if (violations.length === 0) {
    return;
  }

  for (const { pluginName, token, expectedPublisher } of violations) {
    log.warn(
      `Plugin "${pluginName}" consumes global DI token "${token}" but no enabled plugin publishes it. ` +
        `The "${expectedPublisher}" plugin may be disabled or not installed.`
    );
  }

  if (mode === 'error') {
    const summary = violations.map(({ pluginName, token }) => `  ${pluginName} → ${token}`);
    throw new Error(
      `Global DI token validation failed. ${violations.length} consumed token(s) have no provider:\n${summary.join('\n')}`
    );
  }
};
