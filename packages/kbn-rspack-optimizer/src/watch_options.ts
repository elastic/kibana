/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WatchOptions } from '@rspack/core';

export const IGNORED_WATCH_PATTERNS: RegExp[] = [
  /[\\/]node_modules[\\/]/,
  /[\\/]target[\\/]/,
  /\.tsbuildinfo$/,
  /(^|[\\/])tsconfig[^\\/]*\.type_check\.json$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.stories\.[jt]sx?$/,
  /\.mock\.[jt]sx?$/,
  /[\\/]__(?:mocks|snapshots|fixtures|jest)__[\\/]/,
  /[\\/]jest(?:\.integration)?\.config\.[jt]s$/,
  // Scout/Playwright output (test artifacts, reports, server configs) written
  // into plugin dirs during test runs; must not trigger watch rebuilds.
  /[\\/]\.scout[\\/]/,
];

const ignoredWatchPath = ((filePath: string) =>
  IGNORED_WATCH_PATTERNS.some((re) => re.test(filePath))) as unknown as RegExp;

/** Watch options for one compiler. A compiler's own `ignored` wins; otherwise the shared patterns apply. */
export function getWatchOptions(watchOptions: WatchOptions | undefined): WatchOptions {
  return {
    aggregateTimeout: 50,
    ...(watchOptions ?? {}),
    ignored: watchOptions?.ignored ?? ignoredWatchPath,
  };
}
