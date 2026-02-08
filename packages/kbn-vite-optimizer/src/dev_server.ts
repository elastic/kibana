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
import { transformSync } from 'rolldown/experimental';
import type { Connect } from 'vite';
import { discoverUiPlugins, type PluginInfo } from './discover_plugins';

// Vite types - loaded dynamically
type ViteDevServer = Awaited<ReturnType<typeof import('vite')['createServer']>>;
type Plugin = import('vite').Plugin;

// esbuild-compatible plugin types — Rolldown supports esbuild's plugin API
type PluginBuild = import('esbuild').PluginBuild;
type OnLoadArgs = import('esbuild').OnLoadArgs;

/**
 * Browser-side TypeScript transform plugin that replaces Vite's built-in OXC
 * transform. The built-in vite:oxc plugin calls tsconfck for every TypeScript
 * file, running `replaceTokens` which costs ~40% of startup CPU in Kibana's
 * monorepo. This plugin bypasses tsconfig resolution by providing pre-configured
 * options directly to Rolldown's OXC transform.
 *
 * Key differences from the server-side plugin (kbn-vite-server):
 *   - JSX importSource: @emotion/react (for css prop support in browser)
 *   - Also transforms .js files (many Kibana packages use JSX in .js)
 */
function kbnBrowserTransformPlugin(): Plugin {
  // Match TypeScript and JSX files
  const tsRE = /\.(ts|tsx|mts|cts)$/;
  const jsxRE = /\.(tsx|jsx)$/;
  // Also transform .js files — many Kibana packages use JSX in .js files
  const jsRE = /\.js$/;

  return {
    name: 'kbn-browser-transform',

    // Forcibly remove the built-in vite:oxc plugin after config is resolved.
    // Setting `oxc: false` in the config should do this, but in practice the
    // built-in plugin still runs. This hook guarantees it's removed.
    configResolved(resolvedConfig: any) {
      const plugins = resolvedConfig.plugins as { name: string }[];
      for (let i = plugins.length - 1; i >= 0; i--) {
        if (plugins[i].name === 'vite:oxc') {
          plugins.splice(i, 1);
        }
      }
    },

    transform(code: string, id: string) {
      // Skip virtual modules and node_modules
      if (id.startsWith('\0') || id.includes('node_modules')) {
        return null;
      }

      const isTs = tsRE.test(id);
      const isJs = jsRE.test(id);

      // Only transform TypeScript and JavaScript files
      if (!isTs && !isJs) {
        return null;
      }

      // Determine the language from the file extension
      const ext = Path.extname(id).slice(1);
      let lang: 'ts' | 'tsx' | 'js' | 'jsx';
      if (ext === 'tsx') lang = 'tsx';
      else if (ext === 'jsx') lang = 'jsx';
      else if (ext === 'js') lang = 'js';
      else lang = 'ts'; // ts, mts, cts

      const needsJsx = jsxRE.test(id) || isJs; // .js files may contain JSX

      const result = transformSync(id, code, {
        lang,
        sourcemap: true, // Browser always needs source maps for devtools

        // JSX settings — uses @emotion/react for css prop support
        jsx: needsJsx
          ? {
              runtime: 'automatic',
              importSource: '@emotion/react',
              development: true,
            }
          : undefined,

        // TypeScript settings
        assumptions: {
          setPublicClassFields: false,
        },
        typescript: {
          onlyRemoveTypeImports: false,
          removeClassFieldsWithoutInitializer: false,
        },
      });

      if (result.errors.length > 0) {
        const firstError = result.errors[0];
        throw new Error(`Browser transform error in ${id}: ${firstError.message}`);
      }

      return {
        code: result.code,
        map: result.map ?? null,
      };
    },
  };
}

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
 * Generate @kbn/* package aliases pointing to source.
 * Uses parallel async I/O to check candidate paths concurrently,
 * which is faster than sequential Fs.existsSync for hundreds of packages.
 */
async function generateKbnAliases(repoRoot: string): Promise<Record<string, string>> {
  const packages = getPackages(repoRoot);
  const aliases: Record<string, string> = {};
  const fsPromises = Fs.promises;

  // Helper: check if a path exists (async, non-throwing)
  const exists = async (p: string): Promise<boolean> => {
    try {
      await fsPromises.access(p);
      return true;
    } catch {
      return false;
    }
  };

  // Resolve all @kbn/* aliases in parallel
  const kbnPackages = packages.filter((pkg) => pkg.manifest.id.startsWith('@kbn/'));
  const results = await Promise.all(
    kbnPackages.map(async (pkg) => {
      const srcDir = Path.resolve(pkg.directory, 'src');
      const indexTs = Path.resolve(pkg.directory, 'index.ts');
      const indexTsx = Path.resolve(pkg.directory, 'index.tsx');

      if (await exists(srcDir)) {
        return [pkg.manifest.id, srcDir] as const;
      } else if (await exists(indexTs)) {
        return [pkg.manifest.id, indexTs] as const;
      } else if (await exists(indexTsx)) {
        return [pkg.manifest.id, indexTsx] as const;
      } else {
        return [pkg.manifest.id, pkg.directory] as const;
      }
    })
  );

  for (const [id, path] of results) {
    aliases[id] = path;
  }

  return aliases;
}

/**
 * Create Vite plugin for serving plugin source files as ESM
 * No bundling - just transformation
 */
function kbnPluginRoutesPlugin(plugins: PluginInfo[], repoRoot: string): Plugin {
  const pluginMap = new Map(plugins.map((p) => [p.id, p]));

  // Cache resolved file paths — plugin source files don't move at runtime.
  // Keyed by "pluginId/filePath", value is the resolved absolute path or null.
  const fileResolveCache = new Map<string, string | null>();

  // Pre-compiled regex for URL matching (avoids re-compiling per request)
  const pluginRouteRegex = /^\/@kbn-plugin\/([^/]+)\/(.*)$/;

  return {
    name: 'kbn-plugin-routes',

    configureServer(server) {
      // Serve plugin source files at /@kbn-plugin/{id}/{path}
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Match /@kbn-plugin/{id}/{path}
        const match = url.match(pluginRouteRegex);
        if (!match) return next();

        const [, pluginId, filePath] = match;
        const plugin = pluginMap.get(pluginId);
        if (!plugin) {
          // eslint-disable-next-line no-console
          console.warn(`[vite] Plugin not found in pluginMap: ${pluginId}`);
          return next();
        }

        // Check the file-resolution cache first
        const cacheKey = `${pluginId}/${filePath}`;
        let resolvedPath: string | null | undefined = fileResolveCache.get(cacheKey);

        if (resolvedPath === undefined) {
          // Cache miss — resolve the file path
          const basePath = !filePath || filePath === 'index.ts' ? 'index' : filePath;
          const fullBasePath = Path.resolve(plugin.publicDir, basePath);

          // Try common extensions for the resolved path
          resolvedPath = fullBasePath;
          if (!Fs.existsSync(resolvedPath)) {
            resolvedPath = null;
            for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
              if (Fs.existsSync(fullBasePath + ext)) {
                resolvedPath = fullBasePath + ext;
                break;
              }
            }
          }

          if (resolvedPath && !Fs.existsSync(resolvedPath)) {
            resolvedPath = null;
          }

          fileResolveCache.set(cacheKey, resolvedPath);
        }

        if (!resolvedPath) {
          // eslint-disable-next-line no-console
          console.warn(`[vite] Plugin file not found: ${pluginId}/${filePath}`);
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

    // Intercept requests for EUI icon assets from pre-bundled code.
    // After pre-bundling, @elastic/eui.js still contains:
    //   import("./assets/" + typeToPathMap[iconType])
    // These resolve relative to .vite/deps/, producing requests like:
    //   /node_modules/.vite/deps/assets/logo_elastic
    // Vite's optimized dep serving handles these BEFORE resolveId hooks,
    // so we must intercept at the middleware level instead.
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url as string | undefined;
        if (url && url.includes('/.vite/deps/assets/')) {
          // Extract icon name and query string from URL:
          //   /node_modules/.vite/deps/assets/logo_elastic?import
          const match = url.match(/\/\.vite\/deps\/assets\/([^?]+)(\?.*)?$/);
          if (match) {
            const iconName = match[1].replace('.js', '');
            const query = match[2] || '';
            const iconPath = Path.resolve(euiIconsPath, `${iconName}.js`);
            if (Fs.existsSync(iconPath)) {
              // Rewrite to /@fs/ path so Vite serves the real file through its
              // transform pipeline, preserving any query params (e.g. ?import)
              req.url = `/@fs/${iconPath}${query}`;
            }
          }
        }
        next();
      });
    },

    resolveId(source, importer) {
      // Handle dynamic icon imports from EUI's icon component (non-pre-bundled path)
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

  const kbnAliases = await generateKbnAliases(repoRoot);

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

      // TypeScript/JSX transform — replaces Vite's built-in OXC transform to
      // bypass expensive tsconfck tsconfig resolution (replaceTokens hotspot).
      kbnBrowserTransformPlugin(),

      // Fix d3 v3's use of `this` which is undefined in ESM strict mode.
      // d3 v3 wraps all code in `!function() { ... }()` — an IIFE called without
      // a `this` binding. In strict mode `this` is `undefined`, breaking all
      // references like `this.document`, `this.d3`, `this.navigator`, and
      // `d3_vendorSymbol(this, ...)`. The fix is to change the IIFE invocation
      // from `}()` to `}.call(globalThis)`, giving d3 a proper global `this`.
      //
      // d3 is in optimizeDeps.exclude so the rolldown `d3-this-fix` plugin
      // never runs. A `load` hook (unlike `transform`) fires for all modules
      // including excluded deps.
      {
        name: 'kbn-d3-load-fix',
        enforce: 'pre' as const,
        load(id: string) {
          if (id.includes('node_modules/d3/d3.js')) {
            // Strip Vite's query string (e.g. ?v=588468d2) before reading from disk
            const filePath = id.replace(/\?.*$/, '');
            const contents = Fs.readFileSync(filePath, 'utf8');
            // d3 v3 structure: `!function() { ... }();`
            // Replace the final `}();` with `.call(globalThis);` to bind `this`
            // to the global object throughout the entire IIFE.
            const globalRef =
              "typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {}";
            const fixed = contents.replace(
              /\}\(\);?\s*$/,
              `}.call(${globalRef});`
            );
            return { code: fixed, map: null };
          }
          return null;
        },
      },

      // Fallback CJS-to-ESM interop for node_modules packages that aren't
      // pre-bundled via optimizeDeps.include. With noDiscovery: true, any CJS
      // module NOT in the include list would be served raw, breaking browser
      // imports. This plugin:
      //   1. Converts require() calls to ESM imports
      //   2. Provides module/exports shim for CJS code to write to
      //   3. Extracts named exports (exports.x = ...) as ESM named exports
      //   4. Adds ESM default export with __esModule interop
      {
        name: 'kbn-cjs-browser-interop',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          // Only process node_modules files that aren't pre-bundled
          if (!id.includes('/node_modules/') || id.includes('/.vite/deps/')) return null;

          // Skip JSON, CSS, and other non-JS files
          if (/\.(json|css|scss|less|svg|png|jpg|gif|woff2?|ttf|eot)(\?|$)/.test(id)) return null;

          // Skip if file already uses ESM export syntax
          if (/\bexport\s+(default\b|{|\*|function\b|class\b|const\b|let\b|var\b)/.test(code)) {
            return null;
          }

          // Detect CJS/UMD patterns
          const isCjs =
            /typeof\s+exports\s*===?\s*['"]object['"]/.test(code) || // UMD check
            /\bmodule\.exports\b/.test(code) || // module.exports
            /\bexports\.\w+\s*=/.test(code) || // exports.prop = ...
            /Object\.defineProperty\s*\(\s*exports/.test(code); // Object.defineProperty(exports, ...)

          if (!isCjs) return null;

          // --- Step 1: Convert require() calls to ESM imports ---
          // Static require('specifier') calls are replaced with import references.
          // The imports are hoisted by ESM semantics, but for most CJS modules
          // the require() calls are at the top anyway.
          let requireCounter = 0;
          const requireImports: string[] = [];
          let processedCode = code.replace(
            /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
            (_match: string, _quote: string, specifier: string) => {
              const varName = `__cjs_req_${requireCounter++}`;
              requireImports.push(`import ${varName} from '${specifier}';`);
              return varName;
            }
          );

          // --- Step 2: Extract named exports from CJS patterns ---
          const namedExports: string[] = [];

          // Pattern 1: exports.propName = ... (e.g. exports.timeFormatter = timeFormatter)
          const exportsPropRegex = /\bexports\.([a-zA-Z_$]\w*)\s*=/g;
          let propMatch;
          while ((propMatch = exportsPropRegex.exec(code)) !== null) {
            const name = propMatch[1];
            if (name !== '__esModule' && name !== 'default' && !namedExports.includes(name)) {
              namedExports.push(name);
            }
          }

          // Pattern 2: Object.defineProperty(exports, "propName", ...)
          const definePropertyRegex =
            /Object\.defineProperty\s*\(\s*exports\s*,\s*['"]([a-zA-Z_$]\w*)['"]/g;
          let defPropMatch;
          while ((defPropMatch = definePropertyRegex.exec(code)) !== null) {
            const name = defPropMatch[1];
            if (name !== '__esModule' && name !== 'default' && !namedExports.includes(name)) {
              namedExports.push(name);
            }
          }

          // Pattern 3: module.exports = { prop1, prop2: value, ... }
          const moduleExportsObjMatch = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
          if (moduleExportsObjMatch) {
            const props = moduleExportsObjMatch[1]
              .split(',')
              .map((s: string) => s.trim().split(/[:\s]/)[0].trim())
              .filter((k: string) => /^[a-zA-Z_$]\w*$/.test(k) && !namedExports.includes(k));
            namedExports.push(...props);
          }

          // --- Step 3: Build named export statements ---
          // Uses aliased destructuring to avoid conflicts with original identifiers.
          let namedExportCode = '';
          if (namedExports.length > 0) {
            const destructured = namedExports.map((k) => `${k}: __cjs_named_${k}`).join(', ');
            const reExports = namedExports.map((k) => `__cjs_named_${k} as ${k}`).join(', ');
            namedExportCode = `\nvar { ${destructured} } = module.exports;\nexport { ${reExports} };\n`;
          }

          // --- Step 4: Assemble the ESM-wrapped module ---
          return {
            code: [
              // ESM imports from require() conversion (hoisted by the engine)
              ...requireImports,
              // CJS module/exports shim
              'var module = { exports: {} };',
              'var exports = module.exports;',
              // Original module code (with require() calls replaced)
              processedCode,
              // Default export with __esModule interop
              'var __cjs_mod__ = module.exports;',
              'export default (__cjs_mod__ && __cjs_mod__.__esModule ? __cjs_mod__.default : __cjs_mod__);',
              // Named re-exports from module.exports properties
              namedExportCode,
            ].join('\n'),
            map: null,
          };
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
        enforce: 'pre' as const,
        resolveId(id: string) {
          // Stub out server-only modules that can't run in browsers
          if (
            id === 'https' ||
            id === 'http' ||
            id === 'net' ||
            id === 'tls' ||
            id === 'dns' ||
            id === 'fs' ||
            id === 'crypto' ||
            id === 'http-proxy-agent' ||
            id === 'https-proxy-agent'
          ) {
            return `\0virtual:${id}-stub`;
          }
          return null;
        },
        load(id: string) {
          // Handle virtual stubs (from resolveId above)
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
            // Stubs for server-only npm proxy-agent packages
            if (moduleName === 'http-proxy-agent') {
              return `
                export class HttpProxyAgent { constructor() { console.warn('http-proxy-agent is not available in browser'); } }
                export default HttpProxyAgent;
              `;
            }
            if (moduleName === 'https-proxy-agent') {
              return `
                export class HttpsProxyAgent { constructor() { console.warn('https-proxy-agent is not available in browser'); } }
                export default HttpsProxyAgent;
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
          // Fallback: intercept actual file paths for server-only npm packages.
          // If another plugin resolved the bare specifier before our resolveId
          // could intercept it, catch the resolved file path here.
          const cleanId = id.replace(/\?.*$/, '');
          if (cleanId.includes('node_modules/http-proxy-agent/')) {
            return `
              export class HttpProxyAgent { constructor() { console.warn('http-proxy-agent is not available in browser'); } }
              export default HttpProxyAgent;
            `;
          }
          if (cleanId.includes('node_modules/https-proxy-agent/')) {
            return `
              export class HttpsProxyAgent { constructor() { console.warn('https-proxy-agent is not available in browser'); } }
              export default HttpsProxyAgent;
            `;
          }
          return null;
        },
      },

      // Handle EUI icon dynamic imports
      euiIconsPlugin(repoRoot),

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

    // Pre-bundle common dependencies for faster loading.
    // The include list must be comprehensive because Kibana loads 210+ plugins
    // and discovering deps at runtime triggers full page reloads.
    optimizeDeps: {
      include: [
        // --- Core React ---
        'react',
        'react-dom',
        'react-dom/client',
        'react-dom/server',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-is',
        'react-fast-compare',
        'scheduler',
        'prop-types',
        'hoist-non-react-statics',
        'object-assign',

        // --- Emotion ---
        '@emotion/react',
        '@emotion/cache',
        '@emotion/css',
        '@emotion/styled',

        // --- Elastic UI ---
        '@elastic/eui',
        '@elastic/eui-theme-borealis',
        '@elastic/eui/lib/services/theme/warning',
        '@elastic/eui/lib/components/provider/nested',
        '@elastic/eui/es/components/icon/assets/sparkles',
        '@elastic/eui/es/components/icon/assets/filter',
        '@elastic/eui/es/components/icon/assets/search',
        '@elastic/eui/es/components/icon/assets/pencil',
        '@elastic/eui/es/components/icon/assets/list',
        '@elastic/eui/es/components/icon/assets/sortable',
        '@elastic/eui/es/components/icon/assets/logo_elastic',
        '@elastic/eui/es/components/icon/assets/warning',
        '@elastic/eui/es/components/icon/assets/eye',
        '@elastic/eui/es/components/icon/assets/lock',

        // --- Elastic packages ---
        '@elastic/apm-rum',
        '@elastic/apm-rum-core',
        '@elastic/charts',
        '@elastic/charts/dist/utils/data/formatters',
        '@elastic/charts/dist/chart_types/partition_chart/layout/config',
        '@elastic/datemath',
        '@elastic/ebt/client',
        '@elastic/ebt/shippers/fullstory',
        '@elastic/filesaver',
        '@elastic/numeral',
        '@elastic/numeral/languages',
        '@elastic/monaco-esql',
        '@elastic/monaco-esql/lib/definitions',

        // --- Lodash (main + sub-paths) ---
        'lodash',
        'lodash/set',
        'lodash/setWith',
        'lodash/fp',
        'lodash/uniqBy',
        'lodash/camelCase',
        'lodash/isFunction',
        'lodash/isObject',
        'lodash/_isIndex',
        'lodash/_toKey',
        'lodash/_assignValue',
        'lodash/_castPath',

        // --- React ecosystem ---
        'react-router-dom',
        'react-router',
        'react-router-dom-v5-compat',
        'react-redux',
        'react-redux/lib/utils/shallowEqual',
        'react-intl',
        'react-markdown',
        'react-use',
        'react-use/lib/useObservable',
        'react-use/lib/usePrevious',
        'react-use/lib/useInterval',
        'react-use/lib/useDeepCompareEffect',
        'react-use/lib/useDebounce',
        'react-use/lib/useAsync',
        'react-use/lib/useAsyncFn',
        'react-use/lib/useEvent',
        'react-use/lib/useLocalStorage',
        'react-use/lib/useSessionStorage',
        'react-use/lib/useMeasure',
        'react-use/lib/useLatest',
        'react-use/lib/useRafState',
        'react-use/lib/useMountedState',
        'react-use/lib/useUnmount',
        'react-use/lib/useMount',
        'react-use/lib/useToggle',
        'react-use/lib/useUpdateEffect',
        'react-use/lib/useTimeoutFn',
        'react-use/lib/useList',
        'react-use/lib/useEffectOnce',
        'react-use/lib/useBoolean',
        'react-use/lib/useWindowSize',
        'react-use/lib/useFirstMountState',

        // --- State management ---
        '@reduxjs/toolkit',
        'redux',
        'reselect',
        'immer',
        'xstate',
        'xstate/lib/waitFor',
        '@xstate/react',
        'constate',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/shim/with-selector',

        // --- DnD ---
        '@hello-pangea/dnd',
        '@hello-pangea/dnd/dist/dnd',

        // --- Data / query ---
        '@tanstack/react-query',
        '@tanstack/react-query-devtools',
        '@tanstack/query-core',
        'rxjs',
        'io-ts',
        'io-ts/lib/Reporter',
        'io-ts/lib/PathReporter',
        'io-ts/lib/ThrowReporter',
        'fp-ts',
        'fp-ts/Either',
        'fp-ts/pipeable',
        'fp-ts/function',
        'fp-ts/Option',
        'fp-ts/Task',
        'fp-ts/Set',
        'fp-ts/Ord',
        'fp-ts/Array',
        'zod/v3',
        'zod/v4',

        // --- Monaco editor + sub-paths ---
        'monaco-editor',
        'monaco-editor/esm/vs/editor/editor.api',
        'monaco-editor/esm/vs/editor/browser/coreCommands.js',
        'monaco-editor/esm/vs/base/browser/defaultWorkerFactory',
        'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js',
        'monaco-editor/esm/vs/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution.js',
        'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js',
        'monaco-editor/esm/vs/editor/contrib/hover/browser/hover.js',
        'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js',
        'monaco-editor/esm/vs/editor/contrib/links/browser/links.js',
        'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeAction.js',
        'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionModel.js',
        'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionCommands.js',
        'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionContributions.js',
        'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionMenu.js',
        'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js',
        'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js',
        'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js',
        'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js',
        'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js',
        'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js',
        'monaco-editor/esm/vs/editor/contrib/find/browser/findController',
        'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js',
        'monaco-editor/esm/vs/base/common/worker/simpleWorker',
        'monaco-editor/esm/vs/language/json/monaco.contribution.js',
        'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js',
        'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js',
        'monaco-editor/esm/vs/basic-languages/markdown/markdown',
        'monaco-editor/esm/vs/basic-languages/yaml/yaml',
        'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution',
        'monaco-editor/esm/vs/basic-languages/css/css',
        'monaco-yaml',

        // --- Semver sub-paths ---
        'semver/functions/compare',
        'semver/functions/compare-build',
        'semver/functions/coerce',
        'semver/functions/eq',
        'semver/functions/gt',
        'semver/functions/gte',
        'semver/functions/lt',
        'semver/functions/major',
        'semver/functions/minor',
        'semver/functions/valid',
        'semver/classes/semver',

        // --- Validation ---
        'joi',
        'type-detect',

        // --- jQuery (used in kbn-ui-shared-deps-src entry) ---
        'jquery',

        // --- Utilities ---
        'moment',
        'moment-timezone',
        'numeral',
        'classnames',
        'uuid',
        'query-string',
        'history',
        'memoize-one',
        'axios',
        'date-fns',
        'rison-node',
        'tslib',
        'deepmerge',
        'deep-equal',
        'fast-deep-equal',
        'shallowequal',
        'deep-freeze-strict',
        'json-stable-stringify',
        'dedent',
        'lz-string',
        'lru-cache',
        'fastest-levenshtein',
        'email-addresses',
        'p-map',
        'base64-js',
        'eventsource-parser',
        'tree-dump',
        'antlr4',
        'inversify',
        'reflect-metadata/lite',
        'styled-components',
        'resize-observer-polyfill',
        'chroma-js',
        'usng.js',
        // cytoscape-dagre -> dagre -> graphlib has CJS code with
        // `typeof require === "function"` guards that break when served raw
        // through the CJS interop plugin. Pre-bundling handles this correctly.
        'cytoscape-dagre',

        // --- Browser polyfills ---
        'os-browserify/browser',
        'path-browserify',
        'buffer',
        'stream-browserify',
        'util',
        'url',
        'events',
        'querystring',
        'assert',

        // --- Feature flags / telemetry ---
        '@openfeature/web-sdk',
        '@openfeature/launchdarkly-client-provider',
        'launchdarkly-js-client-sdk',

        // --- Formatjs / i18n ---
        '@formatjs/intl',
        '@formatjs/intl-utils',

        // --- AWS / network ---
        '@smithy/util-utf8',
        '@smithy/eventstream-codec',
        'ipaddr.js',

        // --- DnD kit ---
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',

        // --- Testing (used in some browser code) ---
        'jest-diff',

        // --- Additional deps discovered at runtime ---
        'react-hook-form',
        'react-use/lib/useKey',
        'textarea-caret',
        'p-retry',
        'lodash/capitalize',
        '@elastic/ebt/helpers/global_session',
        '@elastic/ebt/shippers/elastic_v3/browser',
        'typescript-fsa',
        'typescript-fsa-reducers',
        'd3-interpolate',
        'd3-array',
        'fp-ts/TaskEither',
        'hjson',
      ],
      // Force a fresh scan when the include list changes. Set to false once
      // the .vite cache is populated with a good set of dependencies.
      force: true,
      exclude: [
        '@kbn/*',
        // Exclude ems-client due to broken exports in its published build
        '@elastic/ems-client',
        // Exclude d3 v3 - it accesses window.navigator during init which fails in pre-bundling
        'd3',
      ],
      // CRITICAL: Disable runtime dependency discovery. Kibana dynamically loads
      // 210+ plugins, each importing various npm packages — many through deep
      // sub-paths (lodash/*, react-use/lib/*, monaco-editor/esm/*, etc.). With
      // discovery enabled, every newly found dep triggers re-optimization which
      // replaces the bundled files (changing content hashes), causing "file does
      // not exist" errors and full page reloads in an infinite loop.
      //
      // With noDiscovery: true, ONLY deps listed in `include` are pre-bundled.
      // Any import not in the list is served directly from node_modules through
      // Vite's on-the-fly transform pipeline — slightly slower per-request but
      // no reloads. This is the correct trade-off for a project of Kibana's size.
      noDiscovery: true,
      holdUntilCrawlEnd: true,
      // Packages with mixed ESM/CJS that need interop handling
      needsInterop: ['monaco-editor'],
      rolldownOptions: {
        moduleTypes: { '.js': 'jsx' },
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

    // Disable Vite's built-in OXC transform — we use kbnBrowserTransformPlugin
    // which calls Rolldown's OXC directly with pre-configured options, bypassing
    // expensive tsconfck tsconfig resolution (replaceTokens: ~40% of startup CPU).
    oxc: false,

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

  const optimizeStartTime = Date.now();

  await server.listen();

  const url = `http://${host}:${port}`;

  // Wait for dependency pre-bundling to complete before reporting ready
  try {
    const depsOptimizer =
      (server as any)._depsOptimizer || (server as any).environments?.client?.depsOptimizer;
    if (depsOptimizer) {
      if (depsOptimizer.scanProcessing) {
        await depsOptimizer.scanProcessing;
      }
      const depCount = depsOptimizer.metadata
        ? Object.keys(depsOptimizer.metadata.optimized || {}).length
        : 0;
      // eslint-disable-next-line no-console
      console.log(
        `[vite-optimize] Pre-bundled ${depCount} dependencies in ${Date.now() - optimizeStartTime}ms`
      );
    }
  } catch {
    // Optimization state not accessible — not critical
  }

  // eslint-disable-next-line no-console
  console.log(`[vite] ESM dev server running at ${url}`);
  if (hmr) {
    // eslint-disable-next-line no-console
    console.log(`[vite] HMR enabled at ws://${host}:${hmrPort}`);
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
