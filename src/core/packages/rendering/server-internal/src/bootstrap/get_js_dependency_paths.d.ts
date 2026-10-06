/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Get JS dependency paths for the unified Rspack compilation.
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) — npm externals (React, lodash, etc.)
 * 2. Rspack async chunks (shared + plugin entries) — JSONP modules queue into
 *    `globalThis.rspackChunkkibana_bundle` (Rspack v2 default) before the runtime loads
 * 3. kibana.bundle.js (LAST) — Rspack runtime drains the JSONP queue, then
 *    dynamic imports resolve instantly without network requests
 * 4. External plugin bundles (if any) — register with __kbnBundles__ on load
 */
export declare const getRspackDependencyPaths: (
  regularBundlePath: string,
  externalPluginPaths?: string[],
  chunkPaths?: string[]
) => string[];
