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
import { build, type InlineConfig } from 'vite';
import type { ToolingLog } from '@kbn/tooling-log';

export interface TranspileOptions {
  packageId: string;
  packageDir: string;
  outputDir: string;
  log?: ToolingLog;
  /** If true, externalize CSS/SCSS imports and skip browser-only files */
  serverOnly?: boolean;
}

export interface TranspileResult {
  packageId: string;
  files: string[];
  duration: number;
}

/**
 * Find all TypeScript files in a package for transpilation
 */
async function findAllTsFiles(packageDir: string, serverOnly: boolean = false): Promise<string[]> {
  const files: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await Fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);
      const relativePath = Path.relative(packageDir, fullPath);

      // Skip directories that shouldn't be included
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'target' ||
          entry.name === '__fixtures__' ||
          entry.name === '__mocks__' ||
          entry.name === '__snapshots__' ||
          entry.name === '.git'
        ) {
          continue;
        }

        // In server-only mode, skip public/browser directories for plugins
        if (serverOnly && (entry.name === 'public' || entry.name === 'browser')) {
          continue;
        }

        await walkDir(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.test.tsx') &&
        !entry.name.endsWith('.mock.ts') &&
        !entry.name.endsWith('.stories.tsx') &&
        !entry.name.endsWith('.story.tsx')
      ) {
        files.push(fullPath);
      }
    }
  }

  await walkDir(packageDir);
  return files;
}

/**
 * Create a Vite config for transpiling a package using Rolldown
 */
function createViteConfig(options: {
  packageDir: string;
  outputDir: string;
  entryFiles: string[];
  serverOnly?: boolean;
}): InlineConfig {
  const { packageDir, outputDir, entryFiles, serverOnly = false } = options;

  // Create input object for rollup/rolldown
  const input: Record<string, string> = {};
  for (const file of entryFiles) {
    const relativePath = Path.relative(packageDir, file);
    // Remove extension and create a clean entry name
    const entryName = relativePath.replace(/\.(ts|tsx)$/, '');
    input[entryName] = file;
  }

  return {
    root: packageDir,
    configFile: false,
    logLevel: 'silent',

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    },

    build: {
      outDir: outputDir,
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      target: 'node18',

      lib: {
        entry: input,
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`,
      },

      rollupOptions: {
        external: (id: string) => {
          // In server-only mode, externalize CSS/SCSS/LESS imports
          if (serverOnly) {
            if (
              id.endsWith('.scss') ||
              id.endsWith('.css') ||
              id.endsWith('.less') ||
              id.endsWith('.sass') ||
              id.endsWith('.svg') ||
              id.endsWith('.png') ||
              id.endsWith('.jpg') ||
              id.endsWith('.gif')
            ) {
              return true;
            }
          }

          // Keep relative imports internal
          if (id.startsWith('.') || id.startsWith('/') || id.startsWith(packageDir)) {
            return false;
          }
          // Externalize node built-ins
          if (id.startsWith('node:')) {
            return true;
          }
          const nodeBuiltins = [
            'path',
            'fs',
            'url',
            'util',
            'crypto',
            'stream',
            'events',
            'buffer',
            'os',
            'child_process',
            'http',
            'https',
            'net',
            'tls',
            'dns',
            'module',
            'vm',
            'assert',
            'zlib',
            'querystring',
            'string_decoder',
            'readline',
            'repl',
            'cluster',
            'dgram',
            'perf_hooks',
            'async_hooks',
            'worker_threads',
            'v8',
            'inspector',
            'trace_events',
            'wasi',
          ];
          if (nodeBuiltins.includes(id)) {
            return true;
          }
          // Externalize @kbn/* packages - they'll be resolved at runtime
          if (id.startsWith('@kbn/')) {
            return true;
          }
          // Externalize other npm packages
          if (!id.startsWith('.') && !Path.isAbsolute(id)) {
            return true;
          }
          return false;
        },

        output: {
          preserveModules: true,
          preserveModulesRoot: packageDir,
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          format: 'es',
        },

        treeshake: false, // We want to keep all exports
      },
    },

    // ESBuild options for TypeScript transpilation (used by Vite internally)
    esbuild: {
      target: 'node18',
      jsx: 'automatic',
      jsxImportSource: 'react',
      sourcesContent: false,
      // Enable JSX parsing for .js files (some packages use this pattern)
      loader: 'tsx',
    },
  };
}

/**
 * Post-process the output to fix ESM import paths
 */
async function fixEsmImports(outputDir: string): Promise<void> {
  async function processDir(dir: string): Promise<void> {
    const entries = await Fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        let content = await Fs.promises.readFile(fullPath, 'utf-8');

        // Fix relative imports to include .js extension
        // Match: from './foo' or from "../bar" but not from './foo.js'
        content = content.replace(
          /from\s+(['"])(\.[^'"]+)(?<!\.js)(?<!\.mjs)(?<!\.cjs)(?<!\.json)\1/g,
          (match, quote, importPath) => {
            // Check if it's importing a directory (should become /index.js)
            const targetPath = Path.resolve(Path.dirname(fullPath), importPath);
            if (Fs.existsSync(targetPath) && Fs.statSync(targetPath).isDirectory()) {
              return `from ${quote}${importPath}/index.js${quote}`;
            }
            return `from ${quote}${importPath}.js${quote}`;
          }
        );

        // Fix dynamic imports too
        content = content.replace(
          /import\s*\(\s*(['"])(\.[^'"]+)(?<!\.js)(?<!\.mjs)(?<!\.cjs)(?<!\.json)\1\s*\)/g,
          (match, quote, importPath) => {
            const targetPath = Path.resolve(Path.dirname(fullPath), importPath);
            if (Fs.existsSync(targetPath) && Fs.statSync(targetPath).isDirectory()) {
              return `import(${quote}${importPath}/index.js${quote})`;
            }
            return `import(${quote}${importPath}.js${quote})`;
          }
        );

        await Fs.promises.writeFile(fullPath, content);
      }
    }
  }

  await processDir(outputDir);
}

/**
 * Get list of output files
 */
async function getOutputFiles(outputDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    if (!Fs.existsSync(dir)) return;
    const entries = await Fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else {
        files.push(Path.relative(outputDir, fullPath));
      }
    }
  }

  await walkDir(outputDir);
  return files;
}

/**
 * Transpile a single package using Vite with Rolldown
 */
export async function transpilePackage(options: TranspileOptions): Promise<TranspileResult> {
  const { packageId, packageDir, outputDir, log, serverOnly = false } = options;
  const startTime = Date.now();

  // Find all TypeScript files to transpile
  const tsFiles = await findAllTsFiles(packageDir, serverOnly);

  if (tsFiles.length === 0) {
    // No TypeScript files, create empty marker
    await Fs.promises.mkdir(outputDir, { recursive: true });
    await Fs.promises.writeFile(
      Path.join(outputDir, 'index.js'),
      `// Package ${packageId} has no transpilable TypeScript files\nexport {};\n`
    );

    return {
      packageId,
      files: ['index.js'],
      duration: Date.now() - startTime,
    };
  }

  log?.debug(`Transpiling ${packageId} (${tsFiles.length} files)`);

  // Create Vite config
  const config = createViteConfig({
    packageDir,
    outputDir,
    entryFiles: tsFiles,
    serverOnly,
  });

  try {
    // Run Vite build (uses Rolldown in Vite 8)
    await build(config);

    // Fix ESM import paths
    await fixEsmImports(outputDir);

    // Get output files
    const files = await getOutputFiles(outputDir);

    const duration = Date.now() - startTime;
    log?.debug(`Completed ${packageId} in ${duration}ms`);

    return {
      packageId,
      files,
      duration,
    };
  } catch (error) {
    // Clean up partial output on failure
    if (Fs.existsSync(outputDir)) {
      await Fs.promises.rm(outputDir, { recursive: true });
    }
    throw error;
  }
}
