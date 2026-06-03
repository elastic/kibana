/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Returns the absolute path to the V8 heap allocation tracking preload script
// for use with `node --require <path>` or `NODE_OPTIONS=--require=<path>`.
export function getHeapTrackPreloadPath(): string {
  return require.resolve('./heap_track_preload.js');
}
