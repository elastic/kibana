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
import type { InlineConfig, PluginOption } from 'vite';
import {
  kbnResolverPlugin,
  kbnSpecialModulesPlugin,
  kbnPeggyPlugin,
  kbnDotTextPlugin,
} from '@kbn/vite-config';

import type { ViteServerOptions } from './types.ts';
import { kbnCacheResolverPlugin } from './cache_resolver_plugin.ts';
import { kbnTransformDiskCachePlugins } from './transform_disk_cache_plugin.ts';
import { kbnTypescriptTransformPlugin } from './kbn_typescript_transform_plugin.ts';

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
  const { repoRoot, hmr = true, log } = options;
  const isVerbose = process.env.KBN_VITE_DEBUG === 'true';

  // Automatic disk-backed transform cache — persists transform results to disk
  // so subsequent startups skip TypeScript compilation for unchanged files.
  // Returns three plugins: a 'pre' reader, a 'post' writer, and a 'post' inline
  // source map stripper (prevents the module runner from expensively decoding
  // inline source maps on every module load).
  const [transformCacheReader, transformCacheWriter, sourceMapStripper] =
    kbnTransformDiskCachePlugins({
      repoRoot,
      verbose: isVerbose,
      log,
    });

  return {
    // Use repo root as the project root
    root: repoRoot,

    // Always development mode for runtime
    mode: 'development',

    // Plugin configuration - order matters!
    // When HMR is disabled (parent/bootstrap process), we use a minimal plugin
    // set — the parent only loads @kbn/cli-dev-mode and its dependencies, so
    // specialized plugins like peggy/dot-text/special-modules are pure no-ops
    // that just add Rolldown plugin dispatch overhead (~wrappedPlugin.<computed>).
    plugins: [
      // Transform disk cache reader — check for cached transform results FIRST
      // (must be the earliest 'pre' plugin so it can short-circuit all transforms)
      transformCacheReader as PluginOption,
      // Module resolver — externalizes node_modules, resolves @kbn/* to source
      kbnCacheResolverPlugin({
        repoRoot,
        verbose: isVerbose,
        log,
        warmCache: hmr, // Only pre-warm for the child process (800+ modules)
      }) as PluginOption,
      // CJS interop plugin - must run before transforms
      cjsInteropPlugin(),
      // Kibana-specific plugins for module resolution (fallback)
      kbnResolverPlugin({ repoRoot }) as PluginOption,
      // The following plugins are only needed for the child process (HMR-enabled):
      // - kbnSpecialModulesPlugin: rewrites @elastic/eui, zod, etc. — all these
      //   are externalized by kbnCacheResolverPlugin before this plugin runs, so
      //   it's a no-op for the parent process.
      // - kbnPeggyPlugin: handles .peggy files — none in CLI dev mode deps.
      // - kbnDotTextPlugin: handles .text files — none in CLI dev mode deps.
      // - kbnServerPlugin: injects HMR accept code — no-op when hmr=false.
      ...(hmr
        ? [
            kbnSpecialModulesPlugin({ repoRoot }) as PluginOption,
            kbnPeggyPlugin() as PluginOption,
            kbnDotTextPlugin() as PluginOption,
            kbnServerPlugin(options),
          ]
        : []),
      // TypeScript transform — replaces vite:oxc with a direct Rolldown/OXC
      // call that uses pre-configured options instead of resolving tsconfig.json
      // per-file. This eliminates the tsconfck replaceTokens hotspot (~20% CPU).
      kbnTypescriptTransformPlugin() as PluginOption,
      // Transform disk cache writer — persist transform results LAST
      // (must be the latest 'post' plugin so it captures the final output)
      transformCacheWriter as PluginOption,

      // Strip inline sourceMappingURL data URIs from all transformed code.
      // The Vite module runner decodes these on every module load via
      // replaceTokens/parse$4, which consumes ~25% of CPU during startup.
      // Stripping them eliminates this overhead entirely.
      sourceMapStripper as PluginOption,
    ],

    // Configure module resolution for Node.js
    resolve: {
      // Prefer Node.js module resolution
      mainFields: ['module', 'main'],
      conditions: ['node', 'module', 'import', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.node'],

      // Externalization config (Vite 8 uses resolve.external/noExternal)
      // Externalize everything by default, then only transform @kbn/* packages.
      // This prevents packages like axios (which has "type": "module") from
      // being loaded through the Module Runner.
      external: true,
      noExternal: [
        // Kibana packages - these are written in TypeScript and are safe to transform
        // EXCEPT infrastructure packages (@kbn/vite-server, @kbn/vite-config) which
        // must be externalized to avoid circular deps with the Module Runner.
        /^@kbn\/(?!vite-server$|vite-config$).*/,
        // lodash-es is the ESM version, safe to transform
        'lodash-es',
        // Packages with ESM issues (missing .js extensions)
        '@n8n/json-schema-to-zod',
      ],
    },

    // SSR configuration for server-side execution
    ssr: {
      // Externalization also configured here for backward compatibility.
      // In Vite 8, the primary externalization config is under `resolve`.
      noExternal: [
        /^@kbn\/(?!vite-server$|vite-config$).*/,
        'lodash-es',
        '@n8n/json-schema-to-zod',
      ],
      external: true,

      // Target Node.js
      target: 'node',
    },

    // Server configuration
    server: {
      // Don't start HTTP server - we only need the transformation pipeline
      middlewareMode: true,

      // SSR HMR is handled via file watcher + module graph invalidation,
      // not WebSocket. Disable both HMR and the standalone WebSocket server
      // to avoid binding port 24678 (which conflicts when parent/child
      // both run Vite).
      hmr: false,
      ws: false,

      // When HMR is disabled (parent/bootstrap process), skip file watching
      // entirely — the parent only loads CliDevMode once and doesn't need
      // ongoing change detection. When HMR is enabled (child process), watch
      // with patterns aligned to the Parcel watcher in @kbn/cli-dev-mode.
      watch: hmr
        ? {
            usePolling: false,
            ignored: [
              '**/node_modules/**',
              '**/target/**',
              '**/build/**',
              '**/.git/**',
              '**/public/**',
              '**/coverage/**',
              '**/__*__/**',
              '**/.chromium/**',
              '**/.es/**',
              '**/.yarn-local-mirror/**',
              '**/*.{test,spec,story,stories}.*',
              '**/*.{md,sh,txt,log,pid}',
            ],
          }
        : null, // No watcher for bootstrap-only instances
    },

    // Build configuration (used by Module Runner for transformation)
    build: {
      // Target Node.js 18+
      target: 'node18',

      // No minification for development
      minify: false,

      // Source maps disabled by default for faster startup.
      // Enable with: KBN_VITE_SOURCEMAPS=true yarn start
      sourcemap: process.env.KBN_VITE_SOURCEMAPS === 'true',

      // SSR build
      ssr: true,

      // Rollup options for module handling
      rolldownOptions: {
        // Preserve modules for better debugging
        output: {
          preserveModules: true,
        },
      },
    },

    // Disable Vite's built-in OXC transform — we use our own TS transform
    // plugin (kbn-typescript-transform) which calls Rolldown's OXC directly
    // with pre-configured options, bypassing expensive tsconfig.json resolution.
    // The built-in vite:oxc plugin calls loadTsconfigJsonForFile() → tsconfck
    // for every TypeScript file, which runs replaceTokens (JSON.stringify →
    // replaceAll → JSON.parse) on large tsconfig objects. In Kibana's monorepo
    // with 1256+ packages, this costs ~20% of startup CPU.
    oxc: false,

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
 * Cache for package type detection (CJS vs ESM).
 * Shared with cache_resolver_plugin for consistency.
 */
const cjsPackageTypeCache = new Map<string, boolean>();

/**
 * Node.js builtin modules that support ESM named exports natively.
 * These should NOT be transformed by the CJS interop plugin.
 */
import { builtinModules } from 'module';
const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((m: string) => `node:${m}`),
]);

/**
 * Check whether a bare specifier package is CJS.
 * Returns true if the package does NOT have "type": "module".
 * Returns false for Node.js builtins (they support named exports).
 */
function isPackageCJS(packageName: string, repoRoot: string): boolean {
  // Node.js builtins support named exports natively
  if (NODE_BUILTINS.has(packageName)) {
    return false;
  }

  const cached = cjsPackageTypeCache.get(packageName);
  if (cached !== undefined) return cached;

  try {
    const pkgJsonPath = Path.resolve(repoRoot, 'node_modules', packageName, 'package.json');
    if (Fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(Fs.readFileSync(pkgJsonPath, 'utf-8'));
      const isCJS = pkgJson.type !== 'module';
      cjsPackageTypeCache.set(packageName, isCJS);
      return isCJS;
    }
  } catch {
    // Ignore errors
  }

  cjsPackageTypeCache.set(packageName, true); // Default to CJS
  return true;
}

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
 * 1. Named imports from CJS packages (auto-detected):
 *    import { x, y as z } from 'pkg' -> import _pkg from 'pkg'; const { x, y: z } = _pkg;
 * 2. require() calls to use createRequire (added at module level)
 * 3. __dirname/__filename shimming for ESM context
 *
 * CJS detection is automatic: any non-@kbn bare specifier that resolves to a
 * package without "type": "module" in its package.json is treated as CJS.
 * This is critical because Vite's Module Runner externalizes bare specifiers
 * and loads them via Node.js import(), which doesn't support named exports
 * from CJS modules reliably.
 */
function cjsInteropPlugin(): import('vite').Plugin {
  // Regex to match ALL named imports from bare specifiers (not relative/absolute paths)
  // Anchored to start-of-line (m flag) to avoid matching inside strings/template literals.
  // Captures: typeKeyword, namedImports, packageName
  const namedImportRegex = /^\s*import\s+(type\s+)?\{([^}]+)\}\s*from\s*['"]([^'"./][^'"]*)['"]/gm;

  // Regex to match default imports from bare specifiers
  // Anchored to start-of-line (m flag) to avoid matching inside strings/template literals.
  // Captures: defaultName, packageName
  // Matches: import Foo from 'pkg' but NOT: import { Foo } from 'pkg' or import type Foo from 'pkg'
  const defaultImportRegex =
    /^\s*import\s+(?!type\s)([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s*['"]([^'"./][^'"]*)['"]/gm;

  // Regex to match combined default + named imports from bare specifiers
  // Anchored to start-of-line (m flag) to avoid matching inside strings/template literals.
  // Matches: import Foo, { bar, baz } from 'pkg'
  // Captures: defaultName, namedImports, packageName
  const combinedImportRegex =
    /^\s*import\s+(?!type\s)([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*\{([^}]+)\}\s*from\s*['"]([^'"./][^'"]*)['"]/gm;

  let resolvedRepoRoot = '';
  let cjsVarCounter = 0;

  return {
    name: 'kbn-cjs-interop',
    enforce: 'pre', // Run before other transforms

    configResolved(config) {
      resolvedRepoRoot = config.root || '';
    },

    transform(code, id) {
      // Skip node_modules - we only need to transform source code
      // Use '/node_modules/' path segment check (not substring match) to avoid
      // false positives on files whose names contain 'node_modules' as a
      // substring (e.g. find_used_node_modules.ts).
      if (id.includes('/node_modules/')) {
        return null;
      }

      // Guard: if the code already contains CJS interop output from a
      // previous transform pass (e.g., the transform disk cache returning
      // a fully-transformed result), skip entirely to avoid duplicate
      // variable declarations that would fail in vite:oxc.
      if (/\bimport \* as _cjs_/.test(code)) {
        return null;
      }

      // Fast-path: skip files that don't contain any patterns we'd transform.
      // This avoids running 4 regex replacements on files that have no CJS patterns.
      const hasImport = code.includes('import');
      const hasRequire = code.includes('require');
      const hasDirname = code.includes('__dirname') || code.includes('__filename');
      const hasModuleExports = code.includes('module.exports');
      if (!hasImport && !hasRequire && !hasDirname && !hasModuleExports) {
        return null;
      }

      let transformed = code;
      let hasChanges = false;
      let needsRequireShim = false;
      let needsDirnameShim = false;
      cjsVarCounter = 0; // Reset per file

      // Shim __dirname and __filename for ESM context
      // These CJS globals are widely used in @kbn/* source files
      if (hasDirname) {
        // Only shim if the code doesn't already define them
        if (
          !code.includes('fileURLToPath(import.meta.url)') &&
          !code.includes('var __dirname =') &&
          !code.includes('const __dirname =') &&
          !code.includes('let __dirname =')
        ) {
          needsDirnameShim = true;
          hasChanges = true;
        }
      }

      // Shim require() for ESM context.
      // Instead of rewriting individual require() calls (which fails for dynamic calls
      // like require(variable) or require.resolve(path)), we inject a `require` variable
      // using createRequire. This handles all require patterns naturally:
      // require(), require.resolve(), require.cache, etc.
      if (
        code.includes('require') &&
        !code.includes('import { createRequire }') &&
        !code.includes('__createRequire') &&
        !code.includes('const require =') &&
        // Check for actual require usage (not just the word in strings/comments)
        /\brequire\s*[.(]/.test(code)
      ) {
        needsRequireShim = true;
        hasChanges = true;
      }

      // Shim module.exports / exports for CJS files running in ESM context.
      // Vite's Module Runner evaluates all code as ESM, so CJS globals like
      // `module` and `exports` are not defined. We inject a shim object and
      // extract named + default ESM exports at the bottom of the file.
      let needsModuleShim = false;
      if (hasModuleExports) {
        if (
          !code.includes('var module =') &&
          !code.includes('const module =') &&
          !code.includes('let module =')
        ) {
          needsModuleShim = true;
          hasChanges = true;
        }
      }

      // Helper: check if a match at a given offset is inside a single-line comment
      function isInsideComment(code: string, matchIndex: number): boolean {
        const lineStart = code.lastIndexOf('\n', matchIndex - 1) + 1;
        const linePrefix = code.substring(lineStart, matchIndex);
        return linePrefix.includes('//');
      }

      // Transform combined default + named imports from CJS packages
      // e.g. import _, { omit } from 'lodash' -> import * as _ns from 'lodash'; const _ = ...; const { omit } = ...;
      // Must run BEFORE the separate named/default transforms since the combined pattern is more specific.
      transformed = transformed.replace(
        combinedImportRegex,
        (
          match: string,
          defaultName: string,
          imports: string,
          packageName: string,
          offset: number
        ) => {
          if (isInsideComment(transformed, offset)) return match;
          if (packageName.startsWith('@kbn/')) return match;
          const basePackage = packageName.startsWith('@')
            ? packageName.split('/').slice(0, 2).join('/')
            : packageName.split('/')[0];
          if (!isPackageCJS(basePackage, resolvedRepoRoot)) return match;

          hasChanges = true;
          const safeVarName = `_cjs_${basePackage.replace(
            /[^a-zA-Z0-9]/g,
            '_'
          )}_${cjsVarCounter++}`;

          const parsedImports = imports
            .split(',')
            .map((s: string) => parseImportSpecifier(s))
            .filter((p: ParsedImport | null): p is ParsedImport => p !== null);

          const typeImports = parsedImports.filter((p: ParsedImport) => p.isType);
          const valueImports = parsedImports.filter((p: ParsedImport) => !p.isType);

          const parts: string[] = [];

          if (typeImports.length > 0) {
            const typeNames = typeImports.map((p: ParsedImport) =>
              p.alias ? `${p.name} as ${p.alias}` : p.name
            );
            parts.push(`import type { ${typeNames.join(', ')} } from '${packageName}'`);
          }

          parts.push(`import * as ${safeVarName} from '${packageName}'`);
          const rawVar = `${safeVarName}_raw`;
          parts.push(`const ${rawVar} = ${safeVarName}.default || ${safeVarName}`);
          parts.push(`const ${defaultName} = ${rawVar}.__esModule ? ${rawVar}.default : ${rawVar}`);

          // Filter out `default` specifiers — they're already handled above
          // via the defaultName assignment. Destructuring `default` would cause
          // a double .default lookup and yield undefined.
          const regularImports = valueImports.filter((p: ParsedImport) => p.name !== 'default');
          if (regularImports.length > 0) {
            const destructured = regularImports
              .map((p: ParsedImport) => toDestructuring(p))
              .join(', ');
            parts.push(
              `const { ${destructured} } = ${rawVar}.__esModule ? ${rawVar}.default : ${rawVar}`
            );
          }

          return parts.join(';\n');
        }
      );

      // Transform named imports from CJS packages (auto-detected)
      // This is critical: when the Module Runner externalizes a CJS module and
      // loads it via Node.js import(), named exports may not be available.
      // We rewrite: import { x } from 'pkg' -> import * as _pkg from 'pkg'; const { x } = _pkg.default || _pkg;
      transformed = transformed.replace(
        namedImportRegex,
        (
          match: string,
          typeKeyword: string | undefined,
          imports: string,
          packageName: string,
          offset: number
        ) => {
          // Skip matches inside comments
          if (isInsideComment(transformed, offset)) {
            return match;
          }
          // Skip pure type imports
          if (typeKeyword) {
            return match;
          }

          // Skip @kbn packages — they're transformed by Vite, not externalized
          if (packageName.startsWith('@kbn/')) {
            return match;
          }

          // Extract base package name for CJS check
          const basePackage = packageName.startsWith('@')
            ? packageName.split('/').slice(0, 2).join('/')
            : packageName.split('/')[0];

          // Only transform if the package is CJS
          if (!isPackageCJS(basePackage, resolvedRepoRoot)) {
            return match;
          }

          const parsedImports = imports
            .split(',')
            .map((s: string) => parseImportSpecifier(s))
            .filter((p: ParsedImport | null): p is ParsedImport => p !== null);

          const typeImports = parsedImports.filter((p: ParsedImport) => p.isType);
          const valueImports = parsedImports.filter((p: ParsedImport) => !p.isType);

          if (valueImports.length === 0) {
            return match;
          }

          hasChanges = true;
          const safeVarName = `_cjs_${basePackage.replace(
            /[^a-zA-Z0-9]/g,
            '_'
          )}_${cjsVarCounter++}`;
          const parts: string[] = [];

          if (typeImports.length > 0) {
            const typeNames = typeImports.map((p: ParsedImport) =>
              p.alias ? `${p.name} as ${p.alias}` : p.name
            );
            parts.push(`import type { ${typeNames.join(', ')} } from '${packageName}'`);
          }

          parts.push(`import * as ${safeVarName} from '${packageName}'`);

          // Separate `default` specifier from regular named imports.
          // `import { default as X }` is equivalent to `import X from 'pkg'` and
          // must be assigned directly (single .default), NOT destructured (which
          // would cause a double .default lookup and yield undefined).
          const defaultImport = valueImports.find((p: ParsedImport) => p.name === 'default');
          const regularImports = valueImports.filter((p: ParsedImport) => p.name !== 'default');

          const nsValue = `${safeVarName}.default || ${safeVarName}`;

          if (defaultImport) {
            const localName = defaultImport.alias || 'default';
            parts.push(`const ${localName} = ${nsValue}`);
          }

          if (regularImports.length > 0) {
            const destructured = regularImports
              .map((p: ParsedImport) => toDestructuring(p))
              .join(', ');
            parts.push(`const { ${destructured} } = ${nsValue}`);
          }

          return parts.join(';\n');
        }
      );

      // Transform default imports from CJS packages.
      // Some CJS packages have dual entry points (CJS + ESM via `exports` field).
      // Their ESM entry may only have named exports and no `default` export.
      // We rewrite: import X from 'pkg' → import * as __X_ns from 'pkg'; const X = __X_ns.default !== undefined ? __X_ns.default : __X_ns;
      // This handles both cases:
      //   - Package has default export: X = default export
      //   - Package has no default: X = namespace object (behaves like CJS module.exports)
      transformed = transformed.replace(
        defaultImportRegex,
        (match: string, defaultName: string, packageName: string, offset: number) => {
          // Skip matches inside comments
          if (isInsideComment(transformed, offset)) {
            return match;
          }

          // Skip imports generated by the named import transform above
          if (defaultName.startsWith('_cjs_')) {
            return match;
          }

          // Skip @kbn packages
          if (packageName.startsWith('@kbn/')) {
            return match;
          }

          // Extract base package name for CJS check
          const basePackage = packageName.startsWith('@')
            ? packageName.split('/').slice(0, 2).join('/')
            : packageName.split('/')[0];

          // Only transform if the package is CJS
          if (!isPackageCJS(basePackage, resolvedRepoRoot)) {
            return match;
          }

          hasChanges = true;
          const nsVarName = `_cjs_ns_${basePackage.replace(
            /[^a-zA-Z0-9]/g,
            '_'
          )}_${cjsVarCounter++}`;
          // Handle three cases:
          // 1. Pure CJS: module.exports = value → ns.default = value
          // 2. Babel/TS CJS: exports.default = value; exports.__esModule = true → ns.default = { default: value, __esModule: true }
          // 3. ESM: export default value → ns.default = value
          const rawVar = `${nsVarName}_raw`;
          return `import * as ${nsVarName} from '${packageName}';\nconst ${rawVar} = ${nsVarName}.default || ${nsVarName};\nconst ${defaultName} = ${rawVar}.__esModule ? ${rawVar}.default : ${rawVar}`;
        }
      );

      if (hasChanges) {
        // Build preamble with necessary shims
        const preambleLines: string[] = [];

        if (needsDirnameShim || needsRequireShim) {
          preambleLines.push(`import { fileURLToPath as __cjs_fileURLToPath } from 'url';`);
          preambleLines.push(`import { dirname as __cjs_dirname } from 'path';`);
        }

        if (needsDirnameShim) {
          preambleLines.push(`var __filename = __cjs_fileURLToPath(import.meta.url);`);
          preambleLines.push(`var __dirname = __cjs_dirname(__filename);`);
        }

        if (needsRequireShim) {
          preambleLines.push(`import { createRequire as __createRequire } from 'module';`);
          // Define `require` as a variable so all existing require() calls,
          // require.resolve(), require.cache, etc. work naturally in ESM context.
          preambleLines.push(`var require = __createRequire(import.meta.url);`);
        }

        if (needsModuleShim) {
          preambleLines.push(`var module = { exports: {} };`);
          preambleLines.push(`var exports = module.exports;`);
        }

        const preamble = preambleLines.length > 0 ? preambleLines.join('\n') + '\n' : '';

        // For CJS files, extract ESM exports from module.exports so that
        // `import { name } from './cjs-file'` works in the Module Runner.
        let appendix = '';
        if (needsModuleShim) {
          appendix = extractCjsExports(transformed);
        }

        return {
          code: preamble + transformed + appendix,
          map: null,
        };
      }

      return null;
    },
  };
}

/**
 * Extract ESM exports from a CJS file that uses module.exports.
 *
 * Handles two patterns:
 * 1. module.exports = { key1, key2, key3: value } → named re-exports
 * 2. exports.key1 = value; exports.key2 = value  → named re-exports
 *
 * Uses uniquely-prefixed variable names to avoid conflicts with
 * existing local declarations in the original CJS source.
 */
function extractCjsExports(code: string): string {
  // Pattern 1: module.exports = { ... }
  const moduleExportsMatch = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (moduleExportsMatch) {
    const keys = moduleExportsMatch[1]
      .split(',')
      .map((s: string) => s.trim().split(':')[0].trim())
      .filter((k: string) => /^[a-zA-Z_$]\w*$/.test(k));

    if (keys.length > 0) {
      const destructured = keys.map((k: string) => `${k}: __cjs_re_${k}`).join(', ');
      const reExports = keys.map((k: string) => `__cjs_re_${k} as ${k}`).join(', ');
      return `\nconst { ${destructured} } = module.exports;\nexport { ${reExports} };\nexport default module.exports;\n`;
    }
  }

  // Pattern 2: exports.prop = value (multiple assignments)
  const exportsRegex = /\bexports\.([a-zA-Z_$]\w*)\s*=/g;
  const exportProps: string[] = [];
  let match;
  while ((match = exportsRegex.exec(code)) !== null) {
    if (!exportProps.includes(match[1])) {
      exportProps.push(match[1]);
    }
  }

  if (exportProps.length > 0) {
    const destructured = exportProps.map((k: string) => `${k}: __cjs_re_${k}`).join(', ');
    const reExports = exportProps.map((k: string) => `__cjs_re_${k} as ${k}`).join(', ');
    return `\nconst { ${destructured} } = module.exports;\nexport { ${reExports} };\nexport default module.exports;\n`;
  }

  // Fallback: just export default
  return '\nexport default module.exports;\n';
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
      // Use '/node_modules/' path segment check (not substring match) to avoid
      // false positives on files whose names contain 'node_modules' as a
      // substring (e.g. find_used_node_modules.ts).
      if (id.includes('/node_modules/')) {
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
