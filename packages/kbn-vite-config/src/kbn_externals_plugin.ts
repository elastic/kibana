/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin } from 'vite';

export interface SharedDepsConfig {
  /**
   * Dependencies that should be treated as external and loaded from shared bundles
   */
  externals: string[];

  /**
   * The global variable name for accessing shared dependencies at runtime
   * Defaults to '__kbnSharedDeps__'
   */
  globalName?: string;
}

/**
 * Plugin that externalizes shared dependencies similar to @kbn/ui-shared-deps-src.
 * These dependencies are loaded once and shared across all plugin bundles.
 */
export function kbnExternalsPlugin(config: SharedDepsConfig): Plugin {
  const { externals, globalName: _globalName = '__kbnSharedDeps__' } = config;
  const externalSet = new Set(externals);

  return {
    name: 'kbn-externals',

    resolveId(source) {
      // Check if this module should be externalized
      if (externalSet.has(source)) {
        return {
          id: source,
          external: true,
        };
      }

      // Check for scoped packages
      for (const ext of externals) {
        if (source.startsWith(`${ext}/`)) {
          return {
            id: source,
            external: true,
          };
        }
      }

      return null;
    },
  };
}

export interface BundleRemotesConfig {
  /**
   * The ID of the current bundle being built
   */
  bundleId: string;

  /**
   * Map of bundle IDs to their allowed dependencies
   * This is typically loaded from the plugin manifests
   */
  bundleDependencies: Map<string, string[]>;

  /**
   * Whether to validate that imports match the declared dependencies
   */
  validateDependencies?: boolean;
}

/**
 * Vite equivalent of the BundleRemotesPlugin from @kbn/optimizer.
 * This plugin handles cross-bundle imports between Kibana plugins,
 * validating dependencies and generating appropriate runtime code.
 *
 * In webpack, this creates special BundleRemoteModule instances.
 * In Vite/Rollup, we use externalization and virtual modules.
 */
export function kbnBundleRemotesPlugin(config: BundleRemotesConfig): Plugin {
  const { bundleId, bundleDependencies, validateDependencies = true } = config;
  const allowedDependencies = bundleDependencies.get(bundleId) || [];
  const allowedSet = new Set(allowedDependencies);

  // Track imports for validation
  const crossBundleImports = new Map<string, Set<string>>();

  return {
    name: 'kbn-bundle-remotes',

    resolveId(source, importer) {
      // Only handle @kbn/* imports that are cross-bundle references
      if (!source.startsWith('@kbn/')) {
        return null;
      }

      // Parse the import to get the target bundle
      const parts = source.split('/');
      const targetBundleId = `${parts[0]}/${parts[1]}`;

      // Check if this is a cross-bundle import (not the current bundle)
      if (targetBundleId === `@kbn/${bundleId}`) {
        return null; // Local import, let other resolvers handle it
      }

      // Check if the target bundle is a known plugin bundle
      if (!bundleDependencies.has(targetBundleId)) {
        return null; // Not a known bundle, let Vite handle it normally
      }

      // Validate the dependency if enabled
      if (validateDependencies && !allowedSet.has(targetBundleId)) {
        // Track the invalid import for error reporting
        const imports = crossBundleImports.get(targetBundleId) || new Set();
        imports.add(importer || 'unknown');
        crossBundleImports.set(targetBundleId, imports);

        this.error(
          `Bundle "${bundleId}" imports from "${targetBundleId}" but it is not listed ` +
            `in requiredBundles or requiredPlugins. Add "${targetBundleId}" to the plugin manifest.`
        );
      }

      // Externalize cross-bundle imports
      // At runtime, these will be resolved via __kbnBundles__.get()
      return {
        id: source,
        external: true,
        meta: {
          kbnBundleRemote: true,
          targetBundle: targetBundleId,
        },
      };
    },

    // Generate runtime code for external bundle references
    renderChunk(code, chunk) {
      // If there are external @kbn/* imports, we need to ensure
      // the runtime bundle loader is available
      const hasExternalKbnImports = chunk.imports.some((imp) => imp.startsWith('@kbn/'));

      if (!hasExternalKbnImports) {
        return null;
      }

      // Add a check for the bundle registry at the top of the chunk
      const runtimeCheck = `
if (typeof __kbnBundles__ === 'undefined') {
  throw new Error('Kibana bundle registry (__kbnBundles__) is not available. Ensure the bundle loader is initialized.');
}
`;

      return {
        code: runtimeCheck + code,
        map: null,
      };
    },

    buildEnd() {
      // Report any dependency validation errors at the end
      if (crossBundleImports.size > 0) {
        const messages = Array.from(crossBundleImports.entries())
          .map(([bundle, importers]) => {
            const importerList = Array.from(importers).join(', ');
            return `  - ${bundle} (imported from: ${importerList})`;
          })
          .join('\n');

        this.warn(`Bundle "${bundleId}" has undeclared cross-bundle dependencies:\n${messages}`);
      }
    },
  };
}

/**
 * Default list of shared dependencies that match @kbn/ui-shared-deps-src externals.
 * These are the core dependencies shared across all Kibana UI bundles.
 */
export const DEFAULT_SHARED_EXTERNALS = [
  '@elastic/eui',
  '@elastic/eui/optimize/es/components/icon/assets',
  '@elastic/charts',
  '@emotion/cache',
  '@emotion/css',
  '@emotion/react',
  '@emotion/styled',
  '@tanstack/react-query',
  '@tanstack/react-query-devtools',
  'classnames',
  'fflate',
  'history',
  'io-ts',
  'jquery',
  'lodash',
  'moment',
  'moment-timezone',
  'react',
  'react-dom',
  'react-dom/server',
  'react-intl',
  'react-is',
  'react-router',
  'react-router-dom',
  'react-use',
  'redux',
  'redux-observable',
  'redux-saga',
  'reselect',
  'rxjs',
  'styled-components',
  'tslib',
  'uuid',
] as const;
