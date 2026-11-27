/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataUrlFromReactComponent } from '../step_icons/icon_to_data_url';

const isJest =
  typeof process !== 'undefined' &&
  (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

/**
 * Same glyphs the data picker's `FieldIcon` draws, keyed by `FieldIcon` type, read from the shared
 * icon set. That module loads with a dynamic `import()` so Jest never has to parse the optimize/es
 * graph (see `ensure_eui_icons.ts`) and the glyphs share one lazy chunk with the other icons.
 */
const TYPE_ICON_KEYS = {
  string: 'tokenString',
  number: 'tokenNumber',
  boolean: 'tokenBoolean',
  array: 'tokenArray',
  object: 'tokenObject',
  null: 'tokenNull',
  date: 'tokenDate',
  unknown: 'question',
} as const;

let cached: Promise<Readonly<Record<string, string>>> | undefined;

/**
 * Data URLs for the data-type glyphs, for CSS `mask-image` on type icons drawn outside React
 * (e.g. reference chips inside Monaco). A mask keeps only the glyph's shape, so one URL per
 * type works in light and dark and the element's own colour paints it. Empty under Jest.
 */
export const loadTypeIconMasks = (): Promise<Readonly<Record<string, string>>> => {
  if (isJest) return Promise.resolve({});
  cached ??= import('./eui_icon_set').then(({ euiIconComponents }) =>
    Object.fromEntries(
      Object.entries(TYPE_ICON_KEYS)
        .map(
          ([type, key]) => [type, getDataUrlFromReactComponent(euiIconComponents[key], '')] as const
        )
        .filter(([, url]) => url !== '')
    )
  );
  return cached;
};
