/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Path from 'path';
export { CoreAppsService } from './src';
export type {
  InternalCoreAppsServiceRequestHandlerContext,
  InternalCoreAppsServiceRouter,
} from './src';
// only used by integration tests
export { FileHashCache, registerRouteForBundle } from './src';
// After the package is built and bootstrap extracts files to bazel-bin, node modules structure exposes assets outside of the src folder
// These constants reference locations in the hierarchy after the build is done
export const ASSETS_DIR = Path.resolve(__dirname, '../assets');
export const FAVICONS_DIR = `${ASSETS_DIR}/favicons`;
export const THEMES_DIR = `${ASSETS_DIR}`;
export const FONTS_DIR = `${ASSETS_DIR}/fonts`;
