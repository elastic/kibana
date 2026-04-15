/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';

/**
 * Load the pre-built DLL manifest from @kbn/ui-shared-deps-npm.
 *
 * The manifest lists modules (npm deps + transitive deps) already bundled
 * into the DLL script (__kbnSharedDeps_npm__). DllReferencePlugin uses it to
 * avoid re-bundling those modules in plugin chunks.
 *
 * IMPORTANT: this function reads the manifest lazily (at call time, not at
 * import time). During distributable builds the DLL is rebuilt by
 * BuildPackages *after* all task modules have been imported, so an
 * eagerly-evaluated constant would capture a stale manifest with wrong
 * module IDs.
 */
export function loadDllManifest() {
  return JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));
}
