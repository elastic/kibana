/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared dependencies that are bundled ONCE and externalized from all plugins.
 * This is the list of packages that go into the shared container.
 *
 * Categories:
 * - CORE: React ecosystem, must be singletons
 * - UI: Elastic UI libraries
 * - UTILS: Common utilities used everywhere
 * - STATE: State management
 * - KBN: Kibana platform packages used across plugins
 */

export interface SharedDep {
  /** Package name */
  name: string;
  /** Export name in the container (defaults to sanitized package name) */
  exportName?: string;
  /** Whether this must be a singleton (only one instance) */
  singleton?: boolean;
  /** Sub-paths to also expose (e.g., 'lodash/fp') */
  subPaths?: string[];
  /** Chunk name for grouping (e.g., 'react', 'elastic', 'utils') */
  chunk?: string;
}

/**
 * Core React dependencies - MUST be singletons
 */
export const CORE_DEPS: SharedDep[] = [
  { name: 'react', singleton: true },
  { name: 'react-dom', singleton: true },
  { name: 'react-dom/client', exportName: 'react-dom-client', singleton: true },
  { name: 'react-dom/server', exportName: 'react-dom-server', singleton: true },
  { name: 'react/jsx-runtime', exportName: 'react-jsx-runtime', singleton: true },
  { name: 'react-router', singleton: true },
  { name: 'react-router-dom', singleton: true },
];

/**
 * Emotion CSS-in-JS - singletons for cache sharing
 */
export const EMOTION_DEPS: SharedDep[] = [
  { name: '@emotion/react', singleton: true },
  { name: '@emotion/cache', singleton: true },
  { name: '@emotion/css', singleton: true },
];

/**
 * Elastic UI libraries
 */
export const ELASTIC_DEPS: SharedDep[] = [
  { name: '@elastic/eui', singleton: true },
  { name: '@elastic/eui/optimize/es', exportName: 'elastic-eui-optimize', singleton: true },
  { name: '@elastic/charts', singleton: true },
  { name: '@elastic/datemath' },
  { name: '@elastic/numeral' },
  { name: '@elastic/safer-lodash-set' },
];

/**
 * State management
 */
export const STATE_DEPS: SharedDep[] = [
  { name: 'rxjs', singleton: true },
  { name: 'redux', singleton: true },
  { name: 'react-redux', singleton: true },
  { name: '@reduxjs/toolkit', singleton: true },
  { name: 'reselect' },
  { name: 'immer' },
];

/**
 * Common utilities
 */
export const UTIL_DEPS: SharedDep[] = [
  { name: 'lodash', subPaths: ['lodash/fp'] },
  { name: 'moment', singleton: true },
  { name: 'moment-timezone', singleton: true },
  { name: 'classnames' },
  { name: 'uuid' },
  { name: 'tslib' },
  { name: 'history' },
  { name: 'query-string' },
  { name: 'rison-node' },
  { name: 'io-ts' },
  { name: 'fp-ts' },
  { name: 'fflate' },
  { name: 'json-stable-stringify' },
];

/**
 * Data/query libraries
 */
export const DATA_DEPS: SharedDep[] = [
  { name: '@tanstack/react-query', singleton: true },
  { name: 'react-use' },
  { name: 'resize-observer-polyfill' },
];

/**
 * Monaco editor
 */
export const MONACO_DEPS: SharedDep[] = [
  { name: 'monaco-editor', singleton: true },
  { name: 'react-monaco-editor', singleton: true },
];

/**
 * Kibana platform packages that are widely shared
 * These are @kbn/* packages used by many plugins
 */
export const KBN_PLATFORM_DEPS: SharedDep[] = [
  // Core packages
  { name: '@kbn/i18n', singleton: true },
  { name: '@kbn/i18n-react', singleton: true },
  { name: '@kbn/analytics', singleton: true },
  { name: '@kbn/std' },
  { name: '@kbn/utility-types' },

  // UI packages
  { name: '@kbn/ui-theme' },
  { name: '@kbn/react-kibana-context-theme', singleton: true },
  { name: '@kbn/react-kibana-context-render', singleton: true },
  { name: '@kbn/kibana-react-plugin', singleton: true },

  // ES Query
  { name: '@kbn/es-query' },
  { name: '@kbn/es-types' },

  // Field types
  { name: '@kbn/field-types' },
  { name: '@kbn/field-formats-plugin' },

  // Data
  { name: '@kbn/datemath' },
  { name: '@kbn/timerange' },

  // Monaco/code editor
  { name: '@kbn/monaco' },
  { name: '@kbn/code-editor' },
  { name: '@kbn/esql-ast' },
  { name: '@kbn/esql-validation-autocomplete' },

  // Expressions
  { name: '@kbn/expressions-plugin' },

  // Embeddables
  { name: '@kbn/embeddable-plugin' },

  // Config schema
  { name: '@kbn/config-schema' },
];

/**
 * All shared dependencies combined
 */
export const ALL_SHARED_DEPS: SharedDep[] = [
  ...CORE_DEPS,
  ...EMOTION_DEPS,
  ...ELASTIC_DEPS,
  ...STATE_DEPS,
  ...UTIL_DEPS,
  ...DATA_DEPS,
  ...MONACO_DEPS,
  ...KBN_PLATFORM_DEPS,
];

/**
 * Get a safe export name for a package
 */
export function getExportName(dep: SharedDep): string {
  if (dep.exportName) {
    return dep.exportName;
  }
  // Convert @scope/package to scope_package, special chars to _
  return dep.name.replace(/^@/, '').replace(/[/@-]/g, '_');
}

/**
 * Generate externals config for plugins
 * Maps package names to the shared container exports
 */
export function generateExternalsConfig(containerName: string = 'kbnShared'): Record<string, string> {
  const externals: Record<string, string> = {};

  for (const dep of ALL_SHARED_DEPS) {
    const exportName = getExportName(dep);
    // Format: "kbnShared./react" - MF container reference
    externals[dep.name] = `${containerName}/./${exportName}`;

    // Handle sub-paths
    if (dep.subPaths) {
      for (const subPath of dep.subPaths) {
        const subExportName = subPath.replace(/[/@-]/g, '_');
        externals[subPath] = `${containerName}/./${subExportName}`;
      }
    }
  }

  return externals;
}

/**
 * Generate MF exposes config for the shared container
 */
export function generateContainerExposes(): Record<string, string> {
  const exposes: Record<string, string> = {};

  for (const dep of ALL_SHARED_DEPS) {
    const exportName = getExportName(dep);
    exposes[`./${exportName}`] = dep.name;

    // Handle sub-paths
    if (dep.subPaths) {
      for (const subPath of dep.subPaths) {
        const subExportName = subPath.replace(/[/@-]/g, '_');
        exposes[`./${subExportName}`] = subPath;
      }
    }
  }

  return exposes;
}

/**
 * Get list of singleton dependencies (for MF shared config)
 */
export function getSingletonDeps(): string[] {
  return ALL_SHARED_DEPS.filter((dep) => dep.singleton).map((dep) => dep.name);
}
