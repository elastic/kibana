/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import type { SharedDep } from './shared_deps';

/**
 * Core dependencies that MUST be shared (framework-level, singletons)
 * These are always included regardless of auto-discovery
 */
export const CORE_SHARED_DEPS: SharedDep[] = [
  // React ecosystem - MUST be singletons
  { name: 'react', singleton: true, chunk: 'react' },
  { name: 'react-dom', singleton: true, chunk: 'react' },
  { name: 'react-dom/client', exportName: 'react-dom-client', singleton: true, chunk: 'react' },
  { name: 'react/jsx-runtime', exportName: 'react-jsx-runtime', singleton: true, chunk: 'react' },
  { name: 'react-router', singleton: true, chunk: 'react' },
  { name: 'react-router-dom', singleton: true, chunk: 'react' },

  // Emotion - singleton for cache sharing
  { name: '@emotion/react', singleton: true, chunk: 'react' },
  { name: '@emotion/cache', singleton: true, chunk: 'react' },
  { name: '@emotion/css', singleton: true, chunk: 'react' },

  // State management - singletons
  { name: 'rxjs', singleton: true, chunk: 'state' },
  { name: 'redux', singleton: true, chunk: 'state' },
  { name: 'react-redux', singleton: true, chunk: 'state' },
  { name: '@reduxjs/toolkit', singleton: true, chunk: 'state' },

  // Date/time - singletons for locale sharing
  { name: 'moment', singleton: true, chunk: 'utils' },
  { name: 'moment-timezone', singleton: true, chunk: 'utils' },

  // Elastic UI - large, should be shared
  { name: '@elastic/eui', singleton: true, chunk: 'elastic' },
  { name: '@elastic/eui/optimize/es', exportName: 'elastic-eui-optimize', singleton: true, chunk: 'elastic' },
  { name: '@elastic/charts', singleton: true, chunk: 'elastic' },

  // Monaco editor - large, singleton
  { name: 'monaco-editor', singleton: true, chunk: 'monaco' },

  // i18n - must be singleton for translation sharing
  { name: '@kbn/i18n', singleton: true, chunk: 'kbn-core' },
  { name: '@kbn/i18n-react', singleton: true, chunk: 'kbn-core' },
];

/**
 * Packages that are commonly shared but not critical singletons
 * Auto-discovery can override/extend this list
 */
export const COMMON_SHARED_DEPS: SharedDep[] = [
  // Elastic packages
  { name: '@elastic/datemath', chunk: 'elastic' },
  { name: '@elastic/numeral', chunk: 'elastic' },
  { name: '@elastic/safer-lodash-set', chunk: 'utils' },

  // Utils
  { name: 'lodash', chunk: 'utils' },
  { name: 'classnames', chunk: 'utils' },
  { name: 'uuid', chunk: 'utils' },
  { name: 'tslib', chunk: 'utils' },
  { name: 'history', chunk: 'utils' },
  { name: 'query-string', chunk: 'utils' },
  { name: 'immer', chunk: 'state' },
  { name: 'reselect', chunk: 'state' },

  // FP libraries
  { name: 'io-ts', chunk: 'utils' },
  { name: 'fp-ts', chunk: 'utils' },

  // React utilities
  { name: '@tanstack/react-query', singleton: true, chunk: 'react' },
  { name: 'react-use', chunk: 'react' },
];

/**
 * Patterns for auto-discovering @kbn/* packages
 */
const KBN_PACKAGE_PATTERNS = [
  '@kbn/std',
  '@kbn/utility-types',
  '@kbn/es-query',
  '@kbn/es-types',
  '@kbn/field-types',
  '@kbn/datemath',
  '@kbn/monaco',
  '@kbn/code-editor',
  '@kbn/config-schema',
  '@kbn/analytics',
  '@kbn/ui-theme',
  '@kbn/react-kibana-*',
  '@kbn/kibana-react-plugin',
  '@kbn/expressions-plugin',
  '@kbn/embeddable-plugin',
  '@kbn/esql-*',
];

export interface DiscoveryOptions {
  /** Repository root */
  repoRoot: string;
  /** Minimum number of plugins that must use a dep for it to be shared */
  minPluginUsage?: number;
  /** Include @kbn/* packages in discovery */
  includeKbnPackages?: boolean;
  /** Additional packages to always include */
  additionalPackages?: string[];
  /** Packages to exclude from sharing */
  excludePackages?: string[];
}

export interface DiscoveredDeps {
  /** All shared dependencies (core + discovered) */
  all: SharedDep[];
  /** Dependencies by chunk name */
  byChunk: Map<string, SharedDep[]>;
  /** Statistics about discovery */
  stats: {
    coreCount: number;
    discoveredCount: number;
    totalCount: number;
  };
}

/**
 * Discover shared dependencies by analyzing plugin package.json files
 */
export async function discoverSharedDeps(options: DiscoveryOptions): Promise<DiscoveredDeps> {
  const {
    repoRoot,
    minPluginUsage = 2,
    includeKbnPackages = true,
    additionalPackages = [],
    excludePackages = [],
  } = options;

  // Start with core deps (always shared)
  const coreDeps = [...CORE_SHARED_DEPS];
  const discoveredDeps: SharedDep[] = [];

  // Track package usage across plugins
  const packageUsage = new Map<string, number>();

  // Scan plugin directories
  const pluginDirs = [
    Path.join(repoRoot, 'src/platform/plugins'),
    Path.join(repoRoot, 'x-pack/platform/plugins'),
    Path.join(repoRoot, 'x-pack/solutions'),
  ];

  for (const pluginDir of pluginDirs) {
    if (!Fs.existsSync(pluginDir)) continue;

    await scanDirectory(pluginDir, (pkgJsonPath) => {
      try {
        const pkgJson = JSON.parse(Fs.readFileSync(pkgJsonPath, 'utf-8'));
        const deps = {
          ...pkgJson.dependencies,
          ...pkgJson.peerDependencies,
        };

        for (const depName of Object.keys(deps)) {
          const count = packageUsage.get(depName) ?? 0;
          packageUsage.set(depName, count + 1);
        }
      } catch {
        // Ignore invalid package.json
      }
    });
  }

  // Find packages used by multiple plugins
  const coreDepNames = new Set(coreDeps.map((d) => d.name));
  const commonDepNames = new Set(COMMON_SHARED_DEPS.map((d) => d.name));
  const excludeSet = new Set(excludePackages);

  for (const [pkgName, usageCount] of packageUsage) {
    // Skip if already in core deps or excluded
    if (coreDepNames.has(pkgName) || excludeSet.has(pkgName)) {
      continue;
    }

    // Skip internal/dev packages
    if (pkgName.startsWith('@types/') || pkgName.includes('eslint') || pkgName.includes('jest')) {
      continue;
    }

    // Check if meets minimum usage
    if (usageCount < minPluginUsage) {
      continue;
    }

    // Check if in common deps list
    const commonDep = COMMON_SHARED_DEPS.find((d) => d.name === pkgName);
    if (commonDep) {
      discoveredDeps.push(commonDep);
      continue;
    }

    // Auto-discover @kbn/* packages
    if (includeKbnPackages && pkgName.startsWith('@kbn/')) {
      discoveredDeps.push({
        name: pkgName,
        chunk: 'kbn-packages',
      });
      continue;
    }

    // Auto-discover @elastic/* packages
    if (pkgName.startsWith('@elastic/')) {
      discoveredDeps.push({
        name: pkgName,
        chunk: 'elastic',
      });
      continue;
    }

    // Auto-discover high-usage packages
    if (usageCount >= minPluginUsage * 2) {
      discoveredDeps.push({
        name: pkgName,
        chunk: 'vendors',
      });
    }
  }

  // Add additional packages
  for (const pkgName of additionalPackages) {
    if (!coreDepNames.has(pkgName) && !discoveredDeps.find((d) => d.name === pkgName)) {
      discoveredDeps.push({
        name: pkgName,
        chunk: 'vendors',
      });
    }
  }

  // Combine all deps
  const allDeps = [...coreDeps, ...discoveredDeps];

  // Group by chunk
  const byChunk = new Map<string, SharedDep[]>();
  for (const dep of allDeps) {
    const chunk = dep.chunk ?? 'vendors';
    const existing = byChunk.get(chunk) ?? [];
    existing.push(dep);
    byChunk.set(chunk, existing);
  }

  return {
    all: allDeps,
    byChunk,
    stats: {
      coreCount: coreDeps.length,
      discoveredCount: discoveredDeps.length,
      totalCount: allDeps.length,
    },
  };
}

/**
 * Recursively scan directory for package.json files
 */
async function scanDirectory(
  dir: string,
  callback: (pkgJsonPath: string) => void,
  depth = 0
): Promise<void> {
  if (depth > 3) return; // Don't go too deep

  try {
    const entries = Fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = Path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check for package.json in this directory
        const pkgJsonPath = Path.join(fullPath, 'package.json');
        if (Fs.existsSync(pkgJsonPath)) {
          callback(pkgJsonPath);
        }

        // Recurse into subdirectories
        await scanDirectory(fullPath, callback, depth + 1);
      }
    }
  } catch {
    // Ignore permission errors etc
  }
}

/**
 * Get export name for a package (used in MF exposes)
 */
export function getExportName(dep: SharedDep): string {
  if (dep.exportName) {
    return dep.exportName;
  }
  return dep.name.replace(/^@/, '').replace(/[/@-]/g, '_');
}
