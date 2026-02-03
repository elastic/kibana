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
import { getPackages } from '@kbn/repo-packages';
import type { Connect } from 'vite';
import { discoverUiPlugins, type PluginInfo } from './discover_plugins';

// Vite types - loaded dynamically
type ViteDevServer = Awaited<ReturnType<typeof import('vite')['createServer']>>;
type Plugin = import('vite').Plugin;
type ResolvedConfig = import('vite').ResolvedConfig;

// esbuild types for plugin API
type PluginBuild = import('esbuild').PluginBuild;
type OnLoadArgs = import('esbuild').OnLoadArgs;

export interface DevServerConfig {
  repoRoot: string;
  port?: number;
  host?: string;
  hmr?: boolean;
  hmrPort?: number;
  examples?: boolean;
  pluginFilter?: string[];
  logLevel?: 'info' | 'warn' | 'error' | 'silent';
}

export interface DevServer {
  server: ViteDevServer;
  middleware: Connect.Server;
  close(): Promise<void>;
  getUrl(): string;
  getHmrClientUrl(): string;
  isReady(): boolean;
  pluginIds: string[];
  /** Map of plugin ID to its required plugin IDs */
  pluginDependencies: Record<string, string[]>;
  getImportMap(): Record<string, string>;
}

/**
 * Generate @kbn/* package aliases pointing to source
 */
function generateKbnAliases(repoRoot: string): Record<string, string> {
  const packages = getPackages(repoRoot);
  const aliases: Record<string, string> = {};

  for (const pkg of packages) {
    if (pkg.manifest.id.startsWith('@kbn/')) {
      const srcDir = Path.resolve(pkg.directory, 'src');
      const indexTs = Path.resolve(pkg.directory, 'index.ts');
      const indexTsx = Path.resolve(pkg.directory, 'index.tsx');

      if (Fs.existsSync(srcDir)) {
        aliases[pkg.manifest.id] = srcDir;
      } else if (Fs.existsSync(indexTs)) {
        aliases[pkg.manifest.id] = indexTs;
      } else if (Fs.existsSync(indexTsx)) {
        aliases[pkg.manifest.id] = indexTsx;
      } else {
        aliases[pkg.manifest.id] = pkg.directory;
      }
    }
  }

  return aliases;
}

/**
 * Create Vite plugin for serving plugin source files as ESM
 * No bundling - just transformation
 */
function kbnPluginRoutesPlugin(plugins: PluginInfo[], repoRoot: string): Plugin {
  const pluginMap = new Map(plugins.map((p) => [p.id, p]));

  return {
    name: 'kbn-plugin-routes',

    configureServer(server) {
      // Serve plugin source files at /@kbn-plugin/{id}/{path}
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Match /@kbn-plugin/{id}/{path}
        const match = url.match(/^\/@kbn-plugin\/([^/]+)\/(.*)$/);
        if (!match) return next();

        const [, pluginId, filePath] = match;
        const plugin = pluginMap.get(pluginId);
        if (!plugin) {
          // eslint-disable-next-line no-console
          console.warn(`[vite] Plugin not found in pluginMap: ${pluginId}`);
          return next();
        }

        // Resolve file path
        let resolvedPath: string;
        const basePath = !filePath || filePath === 'index.ts' ? 'index' : filePath;
        const fullBasePath = Path.resolve(plugin.publicDir, basePath);

        // Try common extensions for the resolved path
        resolvedPath = fullBasePath;
        if (!Fs.existsSync(resolvedPath)) {
          for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
            if (Fs.existsSync(fullBasePath + ext)) {
              resolvedPath = fullBasePath + ext;
              break;
            }
          }
        }

        if (!Fs.existsSync(resolvedPath)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[vite] Plugin file not found: ${pluginId}/${filePath} (tried ${resolvedPath})`
          );
          return next();
        }

        try {
          // Get the path relative to repo root for Vite
          const relativePath = '/' + Path.relative(repoRoot, resolvedPath);

          // Use Vite's transform pipeline
          const result = await server.transformRequest(relativePath);

          if (result) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.end(result.code);
            return;
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[vite] Error transforming ${resolvedPath}:`, e);
        }

        next();
      });
    },

    resolveId(source, importer) {
      // Handle plugin imports
      if (source.startsWith('plugin/')) {
        const parts = source.split('/');
        const pluginId = parts[1];
        const plugin = pluginMap.get(pluginId);
        if (plugin) {
          const subPath = parts.slice(2).join('/') || '';
          return !subPath || subPath === 'public'
            ? Path.resolve(plugin.publicDir, 'index.ts')
            : Path.resolve(plugin.directory, subPath, 'index.ts');
        }
      }
      return null;
    },
  };
}

/**
 * Create Vite plugin for handling EUI icon dynamic imports
 * EUI loads icons dynamically which breaks when pre-bundled.
 * This plugin transforms the icon loading to use static imports.
 */
function euiIconsPlugin(repoRoot: string): Plugin {
  const euiIconsPath = Path.resolve(
    repoRoot,
    'node_modules/@elastic/eui/es/components/icon/assets'
  );

  return {
    name: 'kbn-eui-icons',
    enforce: 'pre',

    resolveId(source, importer) {
      // Handle dynamic icon imports from EUI's icon component
      if (importer && importer.includes('@elastic/eui') && source.startsWith('./assets/')) {
        const iconName = source.replace('./assets/', '').replace('.js', '');
        const iconPath = Path.resolve(euiIconsPath, `${iconName}.js`);
        if (Fs.existsSync(iconPath)) {
          return iconPath;
        }
      }
      return null;
    },

    load(id) {
      // Provide a shim for the icon bundle lookup that EUI uses
      if (id.includes('@elastic/eui') && id.includes('icon_map')) {
        return null; // Let Vite handle it normally
      }
      return null;
    },
  };
}

/**
 * Create Vite plugin for handling JSX in .js files and CJS-to-ESM conversion
 */
function jsxInJsPlugin(): Plugin {
  return {
    name: 'kbn-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      // Skip node_modules except for @kbn packages that might be symlinked
      if (id.includes('node_modules') && !id.includes('@kbn')) {
        return null;
      }

      if (!id.endsWith('.js')) {
        return null;
      }

      const hasJsx = /<[A-Z][a-zA-Z0-9]*|<[a-z]+[\s>\/]/.test(code);
      const hasCjs = /\b(exports\.|module\.exports|require\s*\()/.test(code);

      if (!hasJsx && !hasCjs) {
        return null;
      }

      // eslint-disable-next-line no-new-func
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const esbuild = await dynamicImport('esbuild');

      try {
        const result = await esbuild.transform(code, {
          loader: hasJsx ? 'jsx' : 'js',
          jsx: 'automatic',
          jsxImportSource: '@emotion/react',
          format: 'esm',
          sourcefile: id,
          sourcemap: true,
          target: 'es2020',
        });
        return { code: result.code, map: result.map };
      } catch {
        return null;
      }
    },
  };
}

/**
 * Create and start the Vite dev server for ESM development
 */
export async function createDevServer(config: DevServerConfig): Promise<DevServer> {
  const {
    repoRoot,
    port = 5173,
    host = 'localhost',
    hmr = true,
    hmrPort = 5174,
    examples = false,
    pluginFilter,
    logLevel = 'info',
  } = config;

  // eslint-disable-next-line no-new-func
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const [vite, kbnViteConfig, reactPlugin] = await Promise.all([
    dynamicImport('vite'),
    dynamicImport('@kbn/vite-config'),
    dynamicImport('@vitejs/plugin-react'),
  ]);

  const plugins = discoverUiPlugins(repoRoot, { examples, filter: pluginFilter });
  if (plugins.length === 0) {
    throw new Error('No UI plugins found');
  }

  // eslint-disable-next-line no-console
  console.log(`[vite] Discovered ${plugins.length} UI plugins for ESM serving`);

  const kbnAliases = generateKbnAliases(repoRoot);

  // Create plugin path aliases and collect entry points for pre-bundling
  const pluginAliases: Record<string, string> = {};
  const pluginEntryPoints: string[] = [];

  // Plugins to exclude from dependency scanning due to broken exports
  // These plugins have import/export issues that break the esbuild scan
  const excludeFromScan = new Set<string>([]);

  for (const plugin of plugins) {
    const entryFile = Path.resolve(plugin.publicDir, 'index.ts');
    pluginAliases[`plugin/${plugin.id}`] = entryFile;

    // Skip plugins with known broken exports for dependency scanning
    if (excludeFromScan.has(plugin.id)) {
      // eslint-disable-next-line no-console
      console.log(`[vite] Excluding plugin '${plugin.id}' from dependency scan (known issues)`);
      continue;
    }

    // Check for .tsx if .ts doesn't exist
    if (Fs.existsSync(entryFile)) {
      pluginEntryPoints.push(entryFile);
    } else {
      const tsxEntry = Path.resolve(plugin.publicDir, 'index.tsx');
      if (Fs.existsSync(tsxEntry)) {
        pluginEntryPoints.push(tsxEntry);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[vite] Pre-analyzing ${pluginEntryPoints.length} plugin entry points for dependency discovery`
  );
  // eslint-disable-next-line no-console
  console.log(
    `[vite] Plugin entry points sample:`,
    pluginEntryPoints.slice(0, 5).map((p) => Path.relative(repoRoot, p))
  );

  const server = await vite.createServer({
    root: repoRoot,
    mode: 'development',
    logLevel,
    configFile: false,

    server: {
      port,
      host,
      strictPort: true,
      hmr: hmr ? { port: hmrPort, host } : false,
      open: false,
      // Allow serving any file in the repo
      fs: {
        allow: [repoRoot],
        strict: false,
      },
      // Enable CORS for cross-origin ESM loading
      cors: {
        origin: '*',
        methods: ['GET', 'HEAD'],
        allowedHeaders: ['Content-Type', 'Accept'],
      },
    },

    resolve: {
      alias: [
        // Spread @kbn/* and plugin aliases as array entries
        ...Object.entries(kbnAliases).map(([find, replacement]) => ({ find, replacement })),
        ...Object.entries(pluginAliases).map(([find, replacement]) => ({ find, replacement })),
        // Provide browser-compatible polyfills for Node.js modules
        { find: 'os', replacement: 'os-browserify/browser' },
        { find: 'path', replacement: 'path-browserify' },
        { find: 'buffer', replacement: 'buffer/' },
        { find: 'stream', replacement: 'stream-browserify' },
        { find: 'util', replacement: 'util/' },
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
      mainFields: ['browser', 'module', 'main'],
    },

    plugins: [
      // Debug plugin to track optimization
      {
        name: 'kbn-optimize-debug',
        configResolved(resolvedConfig: ResolvedConfig) {
          // eslint-disable-next-line no-console
          console.log(
            `[vite-optimize] Config resolved. optimizeDeps.entries count:`,
            Array.isArray(resolvedConfig.optimizeDeps.entries)
              ? resolvedConfig.optimizeDeps.entries.length
              : 'not set'
          );
        },
        buildStart() {
          // eslint-disable-next-line no-console
          console.log(`[vite-optimize] Build starting - dependency pre-bundling will begin...`);
        },
        buildEnd() {
          // eslint-disable-next-line no-console
          console.log(`[vite-optimize] Build ended`);
        },
      },

      // React Fast Refresh for HMR using Oxc (v5.0.0+ uses Oxc instead of Babel)
      // Runtime is injected in render_template.ts bootstrap
      reactPlugin.default({
        jsxImportSource: '@emotion/react',
      }),

      // Inject Buffer global polyfill
      {
        name: 'buffer-polyfill',
        transform(code: string, id: string) {
          // Only inject into source files that might need Buffer
          if (id.includes('node_modules') && !id.includes('@kbn')) {
            return null;
          }
          // Check if the code uses Buffer
          if (
            /\bBuffer\b/.test(code) &&
            !code.includes('import { Buffer }') &&
            !code.includes("from 'buffer'")
          ) {
            return {
              code: `import { Buffer } from 'buffer';\n${code}`,
              map: null,
            };
          }
          return null;
        },
      },

      // Provide stubs for server-only Node.js modules used in client code
      {
        name: 'node-server-module-stubs',
        resolveId(id: string) {
          // Stub out server-only modules that can't run in browsers
          if (
            id === 'https' ||
            id === 'http' ||
            id === 'net' ||
            id === 'tls' ||
            id === 'dns' ||
            id === 'fs' ||
            id === 'crypto'
          ) {
            return `\0virtual:${id}-stub`;
          }
          return null;
        },
        load(id: string) {
          if (id.startsWith('\0virtual:') && id.endsWith('-stub')) {
            const moduleName = id.replace('\0virtual:', '').replace('-stub', '');
            // Provide minimal stubs that won't crash but log warnings
            if (moduleName === 'fs') {
              return `
                const warn = () => console.warn('fs module is not available in browser');
                export const readFileSync = () => { warn(); return ''; };
                export const writeFileSync = () => { warn(); };
                export const existsSync = () => { warn(); return false; };
                export const mkdirSync = () => { warn(); };
                export default { readFileSync, writeFileSync, existsSync, mkdirSync };
              `;
            }
            if (moduleName === 'crypto') {
              return `
                export const createHash = () => ({ update: () => ({ digest: () => '' }) });
                export const randomBytes = (n) => new Uint8Array(n);
                export default { createHash, randomBytes };
              `;
            }
            // Default stub for network modules (http, https, net, tls, dns)
            return `
              const warn = () => console.warn('${moduleName} module is not available in browser');
              export class Agent { constructor() { warn(); } }
              export const request = () => { warn(); return { on: () => {}, end: () => {} }; };
              export const get = request;
              export const globalAgent = new Agent();
              export default { Agent, request, get, globalAgent };
            `;
          }
          return null;
        },
      },

      // Handle EUI icon dynamic imports
      euiIconsPlugin(repoRoot),

      // Handle JSX in .js files
      jsxInJsPlugin(),

      // Serve plugin source files
      kbnPluginRoutesPlugin(plugins, repoRoot),

      // Kibana-specific plugins from @kbn/vite-config
      kbnViteConfig.kbnResolverPlugin({ repoRoot }),
      kbnViteConfig.kbnStylesPlugin({
        repoRoot,
        themeTags: ['borealislight', 'borealisdark'],
        isProduction: false,
      }),
      kbnViteConfig.kbnPeggyPlugin(),
      kbnViteConfig.kbnDotTextPlugin(),
    ],

    // Pre-bundle common dependencies for faster loading
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@emotion/react',
        '@emotion/cache',
        'lodash',
        'lodash/set',
        'lodash/setWith',
        'moment',
        'rxjs',
        'history',
        'numeral',
        'classnames',
        'uuid',
        'query-string',
        'os-browserify/browser',
        'path-browserify',
        'buffer',
        'stream-browserify',
        'util',
        'chroma-js',
        '@elastic/eui',
        'memoize-one',
        // Additional common dependencies to reduce reload cycles
        'react-router-dom',
        'react-router',
        '@tanstack/react-query',
        'immer',
        'react-use',
        'resize-observer-polyfill',
        'io-ts',
        'fp-ts',
        'styled-components',
        '@reduxjs/toolkit',
        'redux',
        'react-redux',
        'reselect',
        'axios',
        'date-fns',
        'rison-node',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        // More dependencies to prevent discovery-triggered reloads
        '@emotion/css',
        '@emotion/styled',
        '@elastic/datemath',
        '@elastic/numeral',
        'tslib',
        'prop-types',
        'hoist-non-react-statics',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/shim/with-selector',
        'scheduler',
        'object-assign',
        'react-is',
        'deep-equal',
        'fast-deep-equal',
        'shallowequal',
        '@tanstack/react-query-devtools',
        'monaco-editor',
        'xstate',
        '@xstate/react',
      ],
      // Force pre-bundling on startup to avoid reload cycles from dependency discovery
      force: true,
      exclude: [
        '@kbn/*',
        // Exclude ems-client due to broken exports in its published build
        '@elastic/ems-client',
        // Exclude d3 v3 - it accesses window.navigator during init which fails in pre-bundling
        'd3',
      ],
      // Analyze all plugin entry points upfront to discover their dependencies
      // This prevents reload cycles when navigating to new plugins
      entries: [
        // Core entry point
        Path.resolve(repoRoot, 'src/core/packages/root/browser-internal/index.ts'),
        // All plugin entry points
        ...pluginEntryPoints,
      ],
      // Wait for dependency crawling to complete before serving
      // This prevents multiple reloads when new dependencies are discovered
      holdUntilCrawlEnd: true,
      // Packages with mixed ESM/CJS that need interop handling
      needsInterop: ['monaco-editor'],
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        jsx: 'automatic',
        jsxImportSource: '@emotion/react',
        plugins: [
          {
            name: 'eui-icons-transform',
            setup(build: PluginBuild) {
              // Transform EUI's dynamic icon imports to use absolute paths
              build.onLoad({ filter: /icon\.js$/, namespace: 'file' }, async (args: OnLoadArgs) => {
                if (!args.path.includes('@elastic/eui')) {
                  return null;
                }

                const fs = await import('fs');
                const path = await import('path');
                let contents = fs.default.readFileSync(args.path, 'utf8');

                // Replace relative dynamic imports with absolute paths
                // EUI uses: import('./assets/' + fileName) or import(`./assets/${fileName}`)
                const assetsDir = path.default.resolve(args.path, '../assets').replace(/\\/g, '/');

                // Transform the dynamic import pattern
                // EUI's import looks like:
                // import( /* webpackChunkName: "icon.[request]" */
                // // comments...
                // './assets/' + typeToPathMap[iconType])
                //
                // We need to replace './assets/' with the absolute path
                contents = contents.replace(/(['"`])\.\/assets\//g, `$1${assetsDir}/`);

                return {
                  contents,
                  loader: 'jsx',
                };
              });
            },
          },
          {
            name: 'd3-this-fix',
            setup(build: PluginBuild) {
              // Fix d3 v3's use of 'this' which is undefined in ESM strict mode
              // d3 v3 uses `this.document` and `this.d3` which fail in ESM
              build.onLoad({ filter: /d3\.js$/, namespace: 'file' }, async (args: OnLoadArgs) => {
                if (!args.path.includes('node_modules/d3/')) {
                  return null;
                }

                const fs = await import('fs');
                let contents = fs.default.readFileSync(args.path, 'utf8');

                // d3 v3 wraps everything in an IIFE that uses `this` to access globals
                // We need to replace references to `this` with explicit window/globalThis
                // The pattern is: !function() { ... this.document ... this.d3 ... }()
                // We wrap it to provide proper `this` binding
                contents = `(function() {
var __d3_global__ = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this;
${contents
  .replace(/\bthis\.document\b/g, '(__d3_global__.document || document)')
  .replace(/\bthis\.d3\b/g, '__d3_global__.d3')}
}).call(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {});`;

                return {
                  contents,
                  loader: 'js',
                };
              });
            },
          },
        ],
      },
    },

    // esbuild for fast transformation
    esbuild: {
      jsx: 'automatic',
      // Use Emotion's JSX runtime to support the css prop on DOM elements
      // Emotion's jsx is a drop-in replacement that handles css prop when present
      jsxImportSource: '@emotion/react',
      target: 'es2020',
      keepNames: true,
    },

    // Define global constants
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify('false'),
      'process.env': JSON.stringify({ NODE_ENV: 'development' }),
      // Node.js global object (browsers use window/globalThis)
      global: 'globalThis',
      // Node.js __dirname and __filename (provide empty strings as fallback)
      __dirname: JSON.stringify('/'),
      __filename: JSON.stringify('/index.js'),
    },

    // Note: CSS/SCSS config is handled by kbnStylesPlugin
  });

  // eslint-disable-next-line no-console
  console.log(`[vite-optimize] Starting server and dependency optimization...`);
  // eslint-disable-next-line no-console
  console.log(
    `[vite-optimize] Entries configured: ${pluginEntryPoints.length + 1} (core + ${
      pluginEntryPoints.length
    } plugins)`
  );
  const optimizeStartTime = Date.now();

  await server.listen();

  const url = `http://${host}:${port}`;

  // eslint-disable-next-line no-console
  console.log(`[vite-optimize] Server listen() completed in ${Date.now() - optimizeStartTime}ms`);

  // Try to wait for deps optimization to complete
  // The _optimizedDeps or similar internal API might have a promise we can wait on
  try {
    // Access Vite's internal optimization state
    const depsOptimizer =
      (server as any)._depsOptimizer || (server as any).environments?.client?.depsOptimizer;
    if (depsOptimizer) {
      // eslint-disable-next-line no-console
      console.log(`[vite-optimize] DepsOptimizer found, waiting for optimization...`);
      if (depsOptimizer.scanProcessing) {
        await depsOptimizer.scanProcessing;
        // eslint-disable-next-line no-console
        console.log(
          `[vite-optimize] Scan processing completed in ${Date.now() - optimizeStartTime}ms`
        );
      }
      if (depsOptimizer.metadata) {
        const depCount = Object.keys(depsOptimizer.metadata.optimized || {}).length;
        // eslint-disable-next-line no-console
        console.log(`[vite-optimize] Optimized ${depCount} dependencies`);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`[vite-optimize] DepsOptimizer not found on server instance`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`[vite-optimize] Error accessing optimization state:`, e);
  }

  // eslint-disable-next-line no-console
  console.log(`[vite] ESM dev server running at ${url}`);
  if (hmr) {
    // eslint-disable-next-line no-console
    console.log(`[vite] HMR enabled at ws://${host}:${hmrPort}`);
  }

  // Add diagnostic logging for HMR and reload events
  server.ws.on('connection', () => {
    // eslint-disable-next-line no-console
    console.log(`[vite-debug] New WebSocket connection established`);
  });

  // Listen for when Vite sends messages to clients
  const originalSend = server.ws.send.bind(server.ws);
  server.ws.send = (...args: Parameters<typeof server.ws.send>) => {
    const payload = args[0];
    if (typeof payload === 'object' && payload !== null) {
      const msg = payload as { type?: string; path?: string; updates?: unknown[] };
      if (msg.type === 'full-reload') {
        // eslint-disable-next-line no-console
        console.log(`[vite-debug] FULL RELOAD triggered for path: ${msg.path || '(all)'}`);
        // Log stack trace to see what triggered the reload
        // eslint-disable-next-line no-console
        console.log(`[vite-debug] Reload stack:`, new Error().stack);
      } else if (msg.type === 'update') {
        // eslint-disable-next-line no-console
        console.log(
          `[vite-debug] HMR update:`,
          (msg.updates as Array<{ path?: string }>)?.map((u) => u.path).join(', ')
        );
      }
    }
    return originalSend(...args);
  };

  // Log when new dependencies are discovered during runtime
  const depsOptimizer =
    (server as any)._depsOptimizer || (server as any).environments?.client?.depsOptimizer;
  if (depsOptimizer && depsOptimizer.registerMissingImport) {
    const originalRegister = depsOptimizer.registerMissingImport.bind(depsOptimizer);
    depsOptimizer.registerMissingImport = (id: string, resolved: string) => {
      // eslint-disable-next-line no-console
      console.log(`[vite-debug] NEW DEPENDENCY DISCOVERED: ${id} -> ${resolved}`);
      return originalRegister(id, resolved);
    };
  }

  // Build plugin dependencies map
  const pluginDependencies: Record<string, string[]> = {};
  for (const plugin of plugins) {
    pluginDependencies[plugin.id] = plugin.requiredPlugins || [];
  }

  return {
    server,
    middleware: server.middlewares,
    pluginIds: plugins.map((p) => p.id),
    pluginDependencies,

    async close() {
      await server.close();
    },

    getUrl() {
      return url;
    },

    getHmrClientUrl() {
      return `http://${host}:${hmrPort}`;
    },

    isReady() {
      return true;
    },

    getImportMap() {
      const importMap: Record<string, string> = {};

      // Plugin imports
      for (const plugin of plugins) {
        importMap[`plugin/${plugin.id}`] = `${url}/@kbn-plugin/${plugin.id}/index.ts`;
      }

      // @kbn/* package imports
      for (const [pkgId, pkgPath] of Object.entries(kbnAliases)) {
        const relativePath = Path.relative(repoRoot, pkgPath);
        importMap[pkgId] = `${url}/${relativePath}`;
      }

      return importMap;
    },
  };
}
