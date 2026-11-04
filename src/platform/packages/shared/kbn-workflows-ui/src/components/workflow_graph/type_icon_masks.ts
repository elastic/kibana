/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataUrlFromReactComponent } from '../step_icons/icon_to_data_url';

interface IconModule {
  readonly icon: Parameters<typeof getDataUrlFromReactComponent>[0];
}

const isJest =
  typeof process !== 'undefined' &&
  (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

/**
 * Same glyphs the data picker's `FieldIcon` draws, keyed by `FieldIcon` type. Loaded with
 * dynamic `import()` so Jest never has to parse the optimize/es graph (see
 * `ensure_eui_icons.ts`).
 */
const ICON_LOADERS: Readonly<Record<string, () => Promise<IconModule>>> = {
  string: () => import('@elastic/eui/optimize/es/components/icon/assets/token_string'),
  number: () => import('@elastic/eui/optimize/es/components/icon/assets/token_number'),
  boolean: () => import('@elastic/eui/optimize/es/components/icon/assets/token_boolean'),
  array: () => import('@elastic/eui/optimize/es/components/icon/assets/token_array'),
  object: () => import('@elastic/eui/optimize/es/components/icon/assets/token_object'),
  null: () => import('@elastic/eui/optimize/es/components/icon/assets/token_null'),
  date: () => import('@elastic/eui/optimize/es/components/icon/assets/token_date'),
  unknown: () => import('@elastic/eui/optimize/es/components/icon/assets/question'),
};

let cached: Promise<Readonly<Record<string, string>>> | undefined;

/**
 * Data URLs for the data-type glyphs, for CSS `mask-image` on type icons drawn outside React
 * (e.g. reference chips inside Monaco). A mask keeps only the glyph's shape, so one URL per
 * type works in light and dark and the element's own colour paints it. Empty under Jest.
 */
export const loadTypeIconMasks = (): Promise<Readonly<Record<string, string>>> => {
  if (isJest) return Promise.resolve({});
  cached ??= Promise.all(
    Object.entries(ICON_LOADERS).map(async ([type, load]) => {
      const { icon } = await load();
      return [type, getDataUrlFromReactComponent(icon, '')] as const;
    })
  ).then((entries) => Object.fromEntries(entries.filter(([, url]) => url !== '')));
  return cached;
};
