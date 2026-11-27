/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sync-warm EUI icons used by the visual builder.
 *
 * Kibana resolves `@elastic/eui` → `optimize/es`. Dynamic `require()` chunks for
 * less-common glyphs (accordion chevron, node overflow menu, …) can stay in the
 * EuiIcon loading placeholder (gray rounded square). Seeding the same cache the
 * aliased package uses makes those glyphs render immediately.
 *
 * All the glyphs live in `eui_icon_set.ts` and load through ONE dynamic `import()`, so they
 * ship as a single lazy chunk (one request, not one per glyph) and Jest (which cannot parse the
 * optimize/es ESM graph) can import this module without transforming those paths.
 */
let seeded = false;

const isJest =
  typeof process !== 'undefined' &&
  (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

export const ensureWorkflowGraphEuiIcons = (): void => {
  if (seeded || isJest) return;
  seeded = true;

  import('./eui_icon_set')
    .then(({ seedEuiIcons }) => seedEuiIcons())
    .catch(() => {
      // Let the next call retry, e.g. after a chunk failed to load.
      seeded = false;
    });
};
