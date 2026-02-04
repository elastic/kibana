/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { InlineConfig, PluginOption } from 'vite';
import { kbnResolverPlugin, kbnSpecialModulesPlugin, kbnPeggyPlugin } from '@kbn/vite-config';

import type { ViteServerOptions } from './types.js';
import { kbnCacheResolverPlugin } from './cache_resolver_plugin.js';

/**
 * Creates a Vite configuration optimized for server-side runtime execution.
 *
 * This config differs from build-time configs in several ways:
 * - Optimized for on-demand transformation (not bundling)
 * - SSR mode enabled for proper Node.js module handling
 * - No minification or production optimizations
 * - Source maps always enabled for debugging
 *
 * Key compatibility requirements discovered through testing:
 * - moment alias: Required for CJS/ESM interop
 * - Kibana plugins: kbnResolverPlugin, kbnSpecialModulesPlugin, kbnPeggyPlugin
 * - SSR noExternal: Transform @kbn/* packages
 */
export function createServerRuntimeConfig(options: ViteServerOptions): InlineConfig {
  const { repoRoot, hmr = true, useCache = true, cacheDir } = options;

  return {
    // Use repo root as the project root
    root: repoRoot,

    // Always development mode for runtime
    mode: 'development',

    // Plugin configuration - order matters!
    plugins: [
      // Cache resolver plugin - resolves from transpile cache if available
      // Must run before other resolvers to short-circuit resolution for cached packages
      kbnCacheResolverPlugin({
        repoRoot,
        cacheDir,
        disabled: !useCache,
        verbose: process.env.KBN_VITE_DEBUG === 'true',
      }) as PluginOption,
      // CJS interop plugin - must run before transforms
      cjsInteropPlugin(),
      // Kibana-specific plugins for module resolution (fallback if not in cache)
      kbnResolverPlugin({ repoRoot }) as PluginOption,
      kbnSpecialModulesPlugin({ repoRoot }) as PluginOption,
      kbnPeggyPlugin() as PluginOption,
      // Custom plugin for server-specific transformations
      kbnServerPlugin(options),
    ],

    // Configure module resolution for Node.js
    resolve: {
      // Prefer Node.js module resolution
      mainFields: ['module', 'main'],
      conditions: ['node', 'module', 'import', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.node'],
      // Note: moment/moment-timezone are externalized (loaded by Node.js directly)
      // so we don't alias them here - aliases would cause Vite to transform them
    },

    // SSR configuration for server-side execution
    ssr: {
      // Only transform @kbn/* packages (ESM/TypeScript ones).
      // Most node_modules packages are externalized by default.
      //
      // For CJS packages imported with named exports (like lodash, moment),
      // we use the cjsInteropPlugin to transform the import statements.
      noExternal: [
        // Kibana packages - these are written in TypeScript and are safe to transform
        /@kbn\/.*/,
        // lodash-es is the ESM version, safe to transform
        'lodash-es',
        // Packages with ESM issues (missing .js extensions)
        '@n8n/json-schema-to-zod',
      ],

      // Target Node.js
      target: 'node',
    },

    // Server configuration
    server: {
      // Don't start HTTP server - we only need the transformation pipeline
      middlewareMode: true,

      // HMR configuration
      hmr: hmr
        ? {
            // Use WebSocket for HMR communication
            protocol: 'ws',
          }
        : false,

      // Watch configuration for file changes
      watch: {
        // Use polling for better cross-platform support
        usePolling: false,
        // Ignore node_modules and build outputs
        ignored: ['**/node_modules/**', '**/target/**', '**/build/**', '**/.git/**'],
      },
    },

    // Build configuration (used by Module Runner for transformation)
    build: {
      // Target Node.js 18+
      target: 'node18',

      // No minification for development
      minify: false,

      // Always generate source maps
      sourcemap: true,

      // SSR build
      ssr: true,

      // Rollup options for module handling
      rollupOptions: {
        // Preserve modules for better debugging
        output: {
          preserveModules: true,
        },
      },
    },

    // esbuild options for fast transformation
    esbuild: {
      // Target Node.js
      target: 'node18',

      // Preserve names for debugging
      keepNames: true,

      // Platform is Node.js
      platform: 'node',

      // Support JSX for React components used in server code
      jsx: 'automatic',
      jsxImportSource: 'react',
    },

    // Optimize deps configuration
    optimizeDeps: {
      // Disable dependency discovery for server runtime
      // We want on-demand transformation, not pre-bundling
      noDiscovery: true,
    },

    // Note: Vite 8 uses Rolldown (Rust-based bundler) by default

    // Define global constants
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
      __DEV__: JSON.stringify(true),
    },

    // Logging configuration
    logLevel: 'warn',

    // Clear screen disabled for better log visibility
    clearScreen: false,
  };
}

/**
 * CJS packages that need import transformation for ESM compatibility.
 * Named imports from these packages will be transformed to:
 *   import { x } from 'pkg' -> import _pkg from 'pkg'; const { x } = _pkg;
 *   import { x as y } from 'pkg' -> import _pkg from 'pkg'; const { x: y } = _pkg;
 *
 * This is necessary because Vite's Module Runner enforces strict ESM semantics
 * and CJS modules don't expose named exports properly.
 */
const CJS_PACKAGES_NEEDING_TRANSFORM = [
  'lodash',
  'moment',
  'moment-timezone',
  'joi', // Joi validation library
];

/**
 * Parse a single import specifier and convert to destructuring syntax.
 * Handles:
 * - 'x' -> { name: 'x', isType: false }
 * - 'x as y' -> { name: 'x', alias: 'y', isType: false }
 * - 'type x' -> { name: 'x', isType: true }
 * - 'type x as y' -> { name: 'x', alias: 'y', isType: true }
 */
interface ParsedImport {
  name: string;
  alias?: string;
  isType: boolean;
}

function parseImportSpecifier(spec: string): ParsedImport | null {
  const trimmed = spec.trim();
  if (!trimmed) return null;

  // Check for 'type' prefix (TypeScript inline type import)
  const isType = trimmed.startsWith('type ');
  const withoutType = isType ? trimmed.slice(5).trim() : trimmed;

  // Match 'name as alias' pattern
  const asMatch = withoutType.match(/^(\w+)\s+as\s+(\w+)$/);
  if (asMatch) {
    return { name: asMatch[1], alias: asMatch[2], isType };
  }

  // Simple name
  if (/^\w+$/.test(withoutType)) {
    return { name: withoutType, isType };
  }

  return null;
}

/**
 * Convert parsed import to destructuring syntax.
 * - { name: 'x' } -> 'x'
 * - { name: 'x', alias: 'y' } -> 'x: y'
 */
function toDestructuring(parsed: ParsedImport): string {
  if (parsed.alias) {
    return `${parsed.name}: ${parsed.alias}`;
  }
  return parsed.name;
}

/**
 * Plugin to handle CommonJS interop in Vite's ESM Module Runner.
 *
 * Transforms:
 * 1. Named imports from CJS packages:
 *    import { x, y as z } from 'pkg' -> import _pkg from 'pkg'; const { x, y: z } = _pkg;
 * 2. require() calls to use createRequire (added at module level)
 */
function cjsInteropPlugin(): import('vite').Plugin {
  // Regex to match named imports from CJS packages
  const importRegex = new RegExp(
    `import\\s+(type\\s+)?\\{([^}]+)\\}\\s*from\\s*['"](${CJS_PACKAGES_NEEDING_TRANSFORM.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|')})['"]`,
    'g'
  );

  // Regex to match require() calls
  const requireRegex = /\brequire\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;

  return {
    name: 'kbn-cjs-interop',
    enforce: 'pre', // Run before other transforms

    transform(code, id) {
      // Skip node_modules - we only need to transform source code
      if (id.includes('node_modules')) {
        return null;
      }

      let transformed = code;
      let hasChanges = false;
      let needsRequireShim = false;

      // Transform require() calls to use __require (createRequire-based)
      // This is synchronous - createRequire is set up at module load time
      if (code.includes('require(') && !code.includes('import { createRequire }')) {
        const newCode = transformed.replace(requireRegex, (match, quote, moduleName) => {
          hasChanges = true;
          needsRequireShim = true;
          return `__require('${moduleName}')`;
        });
        if (newCode !== transformed) {
          transformed = newCode;
        }
      }

      // Transform named imports from CJS packages
      if (
        CJS_PACKAGES_NEEDING_TRANSFORM.some(
          (pkg) => code.includes(`from '${pkg}'`) || code.includes(`from "${pkg}"`)
        )
      ) {
        transformed = transformed.replace(
          importRegex,
          (match, typeKeyword, imports, packageName) => {
            // Skip pure type imports
            if (typeKeyword) {
              return match;
            }

            const parsedImports = imports
              .split(',')
              .map((s: string) => parseImportSpecifier(s))
              .filter((p: ParsedImport | null): p is ParsedImport => p !== null);

            const typeImports = parsedImports.filter((p) => p.isType);
            const valueImports = parsedImports.filter((p) => !p.isType);

            if (valueImports.length === 0) {
              return match;
            }

            hasChanges = true;
            const safeVarName = `_${packageName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const parts: string[] = [];

            if (typeImports.length > 0) {
              const typeNames = typeImports.map((p) =>
                p.alias ? `${p.name} as ${p.alias}` : p.name
              );
              parts.push(`import type { ${typeNames.join(', ')} } from '${packageName}'`);
            }

            parts.push(`import ${safeVarName} from '${packageName}'`);
            const destructured = valueImports.map((p) => toDestructuring(p)).join(', ');
            parts.push(`const { ${destructured} } = ${safeVarName}`);

            return parts.join(';\n');
          }
        );
      }

      if (hasChanges) {
        // Add createRequire shim at the top if needed
        let preamble = '';
        if (needsRequireShim) {
          preamble = `import { createRequire as __createRequire } from 'module';\nconst __require = __createRequire(import.meta.url);\n`;
        }

        return {
          code: preamble + transformed,
          map: null,
        };
      }

      return null;
    },
  };
}

/**
 * Custom Vite plugin for Kibana server-side transformations
 */
function kbnServerPlugin(options: ViteServerOptions): import('vite').Plugin {
  return {
    name: 'kbn-server',

    // Configure how modules are resolved
    configResolved(config) {
      // Log configuration in debug mode
      if (process.env.DEBUG) {
        console.log('[kbn-server] Vite config resolved:', {
          root: config.root,
          mode: config.mode,
          ssr: config.ssr,
        });
      }
    },

    // Transform hook for custom transformations
    transform(code, id) {
      // Skip node_modules
      if (id.includes('node_modules')) {
        return null;
      }

      // Add HMR preamble for Kibana server modules
      if (options.hmr !== false && (id.endsWith('.ts') || id.endsWith('.tsx'))) {
        // Check if this is a module that exports plugin lifecycle hooks
        if (code.includes('export') && (code.includes('setup') || code.includes('start'))) {
          // Inject HMR accept code for plugin modules
          const hmrCode = `
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
          return {
            code: code + hmrCode,
            map: null,
          };
        }
      }

      return null;
    },

    // Handle HMR updates
    handleHotUpdate({ file, server }) {
      // Log HMR updates
      console.log(`[kbn-server] HMR update: ${Path.relative(options.repoRoot, file)}`);

      // Let Vite handle the update
      return undefined;
    },
  };
}
