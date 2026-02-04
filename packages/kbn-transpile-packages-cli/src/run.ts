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
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { transpilePackage, type TranspileResult } from './transpile_package.js';

// Get repo root - go up from packages/kbn-transpile-packages-cli/target/
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
const REPO_ROOT = Path.resolve(__dirname, '../../..');
const CACHE_DIR = Path.resolve(REPO_ROOT, '.transpile-cache');
const MANIFEST_FILE = Path.resolve(CACHE_DIR, 'manifest.json');
const PACKAGE_MAP_PATH = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/private/kbn-repo-packages/package-map.json'
);

interface PackageManifestEntry {
  packageId: string;
  packageDir: string;
  hash: string;
  outputDir: string;
  files: string[];
  transpileTime: number;
}

interface CacheManifest {
  version: number;
  created: string;
  nodeVersion: string;
  packages: Record<string, PackageManifestEntry>;
}

interface PackageInfo {
  id: string;
  directory: string;
  normalizedRepoRelativeDir: string;
  type?: string;
  devOnly?: boolean;
  isTestPackage?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): {
  clean: boolean;
  force: boolean;
  filter: string | undefined;
  skip: string[];
  watch: boolean;
  verbose: boolean;
  concurrency: number;
  help: boolean;
  serverOnly: boolean;
  noDev: boolean;
  noTest: boolean;
} {
  const args = {
    clean: false,
    force: false,
    filter: undefined as string | undefined,
    skip: [] as string[],
    watch: false,
    verbose: false,
    concurrency: 4,
    help: false,
    serverOnly: false,
    noDev: false,
    noTest: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--clean':
        args.clean = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--filter':
        args.filter = argv[++i];
        break;
      case '--skip':
        args.skip.push(argv[++i]);
        break;
      case '--watch':
        args.watch = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--concurrency':
        args.concurrency = parseInt(argv[++i], 10) || 4;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--server-only':
        args.serverOnly = true;
        break;
      case '--no-dev':
        args.noDev = true;
        break;
      case '--no-test':
        args.noTest = true;
        break;
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
  node scripts/transpile_packages

  Transpile all Kibana packages to JavaScript using Vite/Rolldown.
  
  Output is stored in .transpile-cache/ at the repository root.
  This cache can be safely deleted at any time.

  Options:
    --clean            Remove the cache directory before transpiling
    --force            Force transpilation even if cache is valid
    --filter <pattern> Filter packages by name pattern (e.g., "@kbn/core-*")
    --skip <pattern>   Skip packages matching pattern (can be used multiple times)
    --server-only      Only transpile server-side packages (shared-server, shared-common, plugins)
    --no-dev           Exclude dev-only packages
    --no-test          Exclude test packages (test-helper, functional-tests, mocks)
    --watch            Watch for changes and re-transpile (not yet implemented)
    --concurrency <n>  Number of packages to transpile in parallel (default: 4)
    --verbose, -v      Show detailed output
    --help, -h         Show this message

  Examples:
    yarn transpile --server-only --no-dev --no-test   # Server code only, no tooling
    yarn transpile --filter "@kbn/core-*"             # Only core packages
    yarn transpile --skip "@kbn/canvas-*"             # Skip canvas packages
    yarn transpile --skip "@kbn/canvas-*" --skip "@kbn/lens-*"  # Skip multiple
`);
}

/**
 * Parse a kibana.jsonc file (JSON with comments)
 */
function parseJsonc(content: string): any {
  // Remove single-line comments
  const withoutSingleLine = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  const withoutComments = withoutSingleLine.replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(withoutComments);
}

/**
 * Get packages from package-map.json with manifest info
 */
function getPackages(): PackageInfo[] {
  const packageMap: Array<[string, string]> = JSON.parse(
    Fs.readFileSync(PACKAGE_MAP_PATH, 'utf-8')
  );

  return packageMap.map(([id, relativeDir]) => {
    const directory = Path.resolve(REPO_ROOT, relativeDir);
    const manifestPath = Path.join(directory, 'kibana.jsonc');

    let type: string | undefined;
    let devOnly: boolean | undefined;
    let isTestPackage = false;

    if (Fs.existsSync(manifestPath)) {
      try {
        const content = Fs.readFileSync(manifestPath, 'utf-8');
        const manifest = parseJsonc(content);
        type = manifest.type;
        devOnly = manifest.devOnly;

        // Detect test packages
        isTestPackage =
          type === 'functional-tests' ||
          type === 'test-helper' ||
          relativeDir.includes('/test/') ||
          relativeDir.includes('__fixtures__') ||
          id.includes('-test-') ||
          id.includes('-mock') ||
          id.endsWith('-mocks');
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id,
      directory,
      normalizedRepoRelativeDir: relativeDir,
      type,
      devOnly,
      isTestPackage,
    };
  });
}

/**
 * Calculate a hash of all TypeScript files in a package directory
 */
async function calculatePackageHash(packageDir: string): Promise<string> {
  const hash = createHash('sha256');
  const tsFiles: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await Fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);

      // Skip common directories that shouldn't affect the hash
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'target' ||
          entry.name === '.git' ||
          entry.name === '__fixtures__' ||
          entry.name === '__mocks__' ||
          entry.name === '__snapshots__'
        ) {
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
        !entry.name.endsWith('.stories.tsx')
      ) {
        tsFiles.push(fullPath);
      }
    }
  }

  await walkDir(packageDir);

  // Sort for consistent hashing
  tsFiles.sort();

  for (const file of tsFiles) {
    const content = await Fs.promises.readFile(file, 'utf-8');
    hash.update(file);
    hash.update(content);
  }

  // Also include tsconfig.json and package.json if they exist
  for (const configFile of ['tsconfig.json', 'package.json', 'kibana.jsonc']) {
    const configPath = Path.join(packageDir, configFile);
    if (Fs.existsSync(configPath)) {
      const content = await Fs.promises.readFile(configPath, 'utf-8');
      hash.update(configPath);
      hash.update(content);
    }
  }

  return hash.digest('hex');
}

/**
 * Load the cache manifest from disk
 */
function loadManifest(): CacheManifest {
  if (Fs.existsSync(MANIFEST_FILE)) {
    try {
      const content = Fs.readFileSync(MANIFEST_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Corrupted manifest, start fresh
    }
  }

  return {
    version: 1,
    created: new Date().toISOString(),
    nodeVersion: process.version,
    packages: {},
  };
}

/**
 * Save the cache manifest to disk
 */
function saveManifest(manifest: CacheManifest): void {
  Fs.mkdirSync(CACHE_DIR, { recursive: true });
  Fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format milliseconds as human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Simple logging
 */
function createLog(verbose: boolean) {
  return {
    info: (msg: string) => console.log(` info ${msg}`),
    debug: (msg: string) => verbose && console.log(` debg ${msg}`),
    warning: (msg: string) => console.log(` warn ${msg}`),
    error: (msg: string) => console.error(`ERROR ${msg}`),
    success: (msg: string) => console.log(`  ✓   ${msg}`),
  };
}

export async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const log = createLog(args.verbose);
  const startTime = Date.now();

  if (args.watch) {
    log.error('--watch is not yet implemented');
    process.exit(1);
  }

  // Clean cache if requested
  if (args.clean && Fs.existsSync(CACHE_DIR)) {
    log.info('Cleaning cache directory...');
    await Fs.promises.rm(CACHE_DIR, { recursive: true });
  }

  // Ensure cache directory exists
  await Fs.promises.mkdir(CACHE_DIR, { recursive: true });

  // Load existing manifest
  let manifest = loadManifest();
  if (args.force) {
    manifest.packages = {};
  }

  // Get all packages
  log.info('Discovering packages...');
  const allPackages = getPackages();

  // Filter packages based on flags
  let packages = allPackages;

  // Filter by name pattern
  if (args.filter) {
    const filterRegex = new RegExp(args.filter.replace(/\*/g, '.*'));
    packages = packages.filter((pkg) => filterRegex.test(pkg.id));
    log.info(`Filtered to ${packages.length} packages matching "${args.filter}"`);
  }

  // Skip packages matching patterns
  if (args.skip.length > 0) {
    const skipRegexes = args.skip.map((pattern) => new RegExp(pattern.replace(/\*/g, '.*')));
    const before = packages.length;
    packages = packages.filter((pkg) => !skipRegexes.some((regex) => regex.test(pkg.id)));
    log.info(`Skipped ${before - packages.length} packages matching: ${args.skip.join(', ')}`);
  }

  // Exclude dev-only packages
  if (args.noDev) {
    const before = packages.length;
    packages = packages.filter((pkg) => !pkg.devOnly);
    log.info(`Excluded ${before - packages.length} dev-only packages`);
  }

  // Exclude test packages
  if (args.noTest) {
    const before = packages.length;
    packages = packages.filter((pkg) => !pkg.isTestPackage);
    log.info(`Excluded ${before - packages.length} test packages`);
  }

  // Server-only: exclude browser-only packages
  if (args.serverOnly) {
    const before = packages.length;
    // Keep: shared-server, shared-common, plugin, core
    // Exclude: shared-browser, shared-scss
    packages = packages.filter((pkg) => {
      if (!pkg.type) return true; // Include packages without type info
      return ['shared-server', 'shared-common', 'plugin', 'core'].includes(pkg.type);
    });
    log.info(
      `Filtered to ${packages.length} server-side packages (excluded ${
        before - packages.length
      } browser-only)`
    );
  }

  log.info(`Found ${packages.length} packages to process`);

  // Track statistics
  let skipped = 0;
  let transpiled = 0;
  let failed = 0;
  let totalFiles = 0;

  // Process packages in batches for concurrency
  const queue = [...packages];
  const results: Array<{
    pkg: PackageInfo;
    result: TranspileResult | null;
    error?: Error;
  }> = [];

  async function processPackage(pkg: PackageInfo): Promise<{
    pkg: PackageInfo;
    result: TranspileResult | null;
    error?: Error;
  }> {
    try {
      const hash = await calculatePackageHash(pkg.directory);
      const outputDir = Path.join(CACHE_DIR, pkg.normalizedRepoRelativeDir);

      // Check if already cached and valid
      const cached = manifest.packages[pkg.id];
      if (cached && cached.hash === hash && Fs.existsSync(Path.join(outputDir, 'index.js'))) {
        log.debug(`Skipping ${pkg.id} (unchanged)`);
        return { pkg, result: null };
      }

      // Transpile the package
      const result = await transpilePackage({
        packageId: pkg.id,
        packageDir: pkg.directory,
        outputDir,
        log: args.verbose ? ({ debug: (msg: string) => log.debug(msg) } as any) : undefined,
        serverOnly: args.serverOnly,
      });

      // Update manifest
      manifest.packages[pkg.id] = {
        packageId: pkg.id,
        packageDir: pkg.normalizedRepoRelativeDir,
        hash,
        outputDir: Path.relative(CACHE_DIR, outputDir),
        files: result.files,
        transpileTime: result.duration,
      };

      return { pkg, result };
    } catch (error) {
      return { pkg, result: null, error: error as Error };
    }
  }

  // Process in parallel batches
  const processBatch = async () => {
    while (queue.length > 0) {
      const batch = queue.splice(0, args.concurrency);
      const batchResults = await Promise.all(batch.map(processPackage));
      results.push(...batchResults);

      // Update progress
      const processed = results.length;
      const total = packages.length;
      const percent = Math.round((processed / total) * 100);
      process.stdout.write(`\rProgress: ${processed}/${total} (${percent}%)   `);
    }
  };

  await processBatch();
  console.log(''); // New line after progress

  // Process results
  for (const { pkg, result, error } of results) {
    if (error) {
      failed++;
      log.error(`Failed to transpile ${pkg.id}: ${error.message}`);
      if (args.verbose) {
        log.error(error.stack || '');
      }
    } else if (result) {
      transpiled++;
      totalFiles += result.files.length;
      if (args.verbose) {
        log.success(
          `Transpiled ${pkg.id} (${result.files.length} files in ${formatDuration(
            result.duration
          )})`
        );
      }
    } else {
      skipped++;
    }
  }

  // Save updated manifest
  saveManifest(manifest);

  // Calculate cache size
  let cacheSize = 0;
  async function calculateDirSize(dir: string): Promise<void> {
    if (!Fs.existsSync(dir)) return;
    const entries = await Fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = Path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await calculateDirSize(fullPath);
      } else {
        const stat = await Fs.promises.stat(fullPath);
        cacheSize += stat.size;
      }
    }
  }
  await calculateDirSize(CACHE_DIR);

  const totalTime = Date.now() - startTime;

  // Summary
  log.info('');
  log.info('═══════════════════════════════════════════════════════════════');
  log.info('  Transpilation Complete');
  log.info('═══════════════════════════════════════════════════════════════');
  log.info(`  Packages processed: ${packages.length}`);
  log.info(`  Transpiled:         ${transpiled} (${totalFiles} files)`);
  log.info(`  Skipped (cached):   ${skipped}`);
  if (failed > 0) {
    log.warning(`  Failed:             ${failed}`);
  }
  log.info(`  Cache size:         ${formatBytes(cacheSize)}`);
  log.info(`  Total time:         ${formatDuration(totalTime)}`);
  log.info(`  Cache location:     ${CACHE_DIR}`);
  log.info('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}
