/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';

/**
 * Cross-references every plugin's `globals.consumes` tokens against the set of
 * `globals.provides` tokens from all enabled UI plugins.
 *
 * Logs warnings to the browser console; never throws.
 */
export const validateGlobalTokens = (plugins: readonly InjectedMetadataPlugin[]): void => {
  const publishedTokens = new Set<string>();
  for (const { plugin } of plugins) {
    for (const token of plugin.globals.provides) {
      publishedTokens.add(token);
    }
  }

  for (const { id, plugin } of plugins) {
    for (const token of plugin.globals.consumes) {
      if (!publishedTokens.has(token)) {
        const expectedPublisher = token.split('.')[0] ?? 'unknown';
        // eslint-disable-next-line no-console
        console.warn(
          `[DI] Plugin "${id}" consumes global token "${token}" but no enabled plugin publishes it. ` +
            `The "${expectedPublisher}" plugin may be disabled or not loaded.`
        );
      }
    }
  }
};
