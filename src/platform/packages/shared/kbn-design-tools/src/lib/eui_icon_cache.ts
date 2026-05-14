/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-expect-error — no declarations for this internal module
import { appendIconComponentCache } from '@elastic/eui/optimize/es/components/icon/icon';

/**
 * Asynchronously preload all EUI icons into the synchronous icon cache.
 */
export const preloadAllEuiIcons = (() => {
  let promise: Promise<void> | undefined;

  return (): Promise<void> => {
    if (!promise) {
      promise = (async () => {
        const { typeToPathMap } = await import(
          // @ts-expect-error — no declarations for this internal module
          '@elastic/eui/optimize/es/components/icon/icon_map'
        );

        const cache: Record<string, React.ComponentType> = {};

        await Promise.all(
          Object.entries(typeToPathMap).map(async ([type, loader]) => {
            const mod = await (loader as () => Promise<{ icon: React.ComponentType }>)();
            cache[type] = mod.icon;
          })
        );

        appendIconComponentCache(cache);
      })();
    }
    return promise;
  };
})();
