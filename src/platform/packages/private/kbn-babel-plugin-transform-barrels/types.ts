/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Information about a single export from a barrel file.
 */
export interface ExportInfo {
  /** Absolute path to the source file containing the export */
  path: string;
  /** Whether this is a named or default export */
  type: 'named' | 'default';
  /** The local name of the export in the source file */
  localName: string;
  /** The name the export was originally exported as (may differ from localName for re-exports) */
  importedName: string;
  /** For packages with exports field: the public import subpath (without package name) */
  publicSubpath?: string;
}

/**
 * Entry for a single barrel file in the index.
 */
export interface BarrelFileEntry {
  /** Map of export name to export info */
  exports: Record<string, ExportInfo>;
  /** For node_modules barrels: the package name (e.g., 'rxjs', '@kbn/std') */
  packageName?: string;
  /** For node_modules barrels: absolute path to package root */
  packageRoot?: string;
  /** Names of exports defined locally in this barrel file (not re-exports) */
  localExports?: string[];
}

/**
 * Index of all barrel files and their exports.
 * Keys are absolute paths to barrel files (index.ts/js files).
 * Values contain the exports from that barrel file.
 */
export interface BarrelIndex {
  [barrelFilePath: string]: BarrelFileEntry;
}

/**
 * Plugin options passed to the Babel plugin.
 */
export interface PluginOptions {
  /** Pre-built barrel index, if not provided the plugin is a no-op */
  barrelIndex?: BarrelIndex;
}
