/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findPackageForPath } from '@kbn/repo-packages';

/**
 * Gets the app/plugin ID from a file path by looking up the package in kibana.jsonc.
 * Returns the plugin ID for plugins, or the package ID for non-plugin packages.
 *
 * @param filename - The absolute path to the file
 * @param cwd - The repository root directory
 * @returns The app ID or 'Unknown package' if not found
 */
export function getAppIdFromFilePath(filename: string, cwd: string): string {
  const pkg = findPackageForPath(cwd, filename);
  const manifest = pkg?.manifest as { plugin?: { id: string } } | undefined;
  return manifest?.plugin?.id ?? pkg?.id ?? 'Unknown package';
}
