#!/usr/bin/env node

/**
 * Script to count lines of application code in the Kibana repository.
 *
 * EXCLUDES:
 * - Comments (single-line and multi-line)
 * - JSON files
 * - YML/YAML files
 * - Configuration files (tsconfig.*, jest.config.*, *.config.js, etc.)
 * - Test files (*.test.ts, *.spec.ts, etc.)
 * - Test directories (test/, __tests__/, __fixtures__/, __mocks__/)
 * - Dev-only packages/plugins (devOnly: true in kibana.jsonc)
 * - Test-helper and functional-tests type packages
 * - Storybook files (*.stories.*)
 * - Mock files (*.mock.*)
 * - Generated files (target/, build/, node_modules/)
 * - Documentation files
 * - Examples directory
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const JSON_OUTPUT = args.includes('--json');
const HELP = args.includes('--help') || args.includes('-h');

if (HELP) {
  console.log(`
Usage: node count_app_code_lines.js [options]

Options:
  --verbose, -v    Show detailed information including excluded dev-only paths
  --json           Output results in JSON format
  --help, -h       Show this help message

This script counts lines of application code in the Kibana repository,
excluding tests, configuration files, comments, and dev-only packages.
`);
  process.exit(0);
}

// Directories to completely skip
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'target',
  'build',
  'dist',
  '.git',
  'bazel-bin',
  'bazel-out',
  'bazel-kibana',
  'bazel-testlogs',
  'api_docs',
  'docs',
  'dev_docs',
  'legacy_rfcs',
  'licenses',
  'logs',
  'data',
  '.chromium',
  '.es',
  '.beats',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  '__snapshots__',
  'test_data',
  'test-data',
  'fixtures',
  'mocks',
]);

// Top-level test directories and dev tooling
const TEST_DIRS = new Set([
  'test',
  'tests',
  'e2e',
  'ftr_e2e',
  'integration_tests',
  'functional_tests',
  'performance',
  'test_serverless',
  'scout',
  'examples', // Example code, not production
]);

// Directories that are dev tooling (not application code)
const DEV_TOOLING_DIRS = new Set([
  'dev', // src/dev contains build tools, linting, etc.
  'scripts', // Build and utility scripts
  'build_chromium', // Chromium build tools
  'dev-tools', // Development tools
]);

// File patterns to exclude
const EXCLUDED_FILE_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /\.mock\.(ts|tsx|js|jsx)$/,
  /\.mocks\.(ts|tsx|js|jsx)$/,
  /\.test\.mocks\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/, // Type declaration files (often generated)
  /jest\.config\.(ts|js|mjs)$/,
  /jest\.integration\.config\.(ts|js|mjs)$/,
  /tsconfig\..*\.json$/,
  /tsconfig\.json$/,
  /\.eslintrc\.(js|json)$/,
  /\.prettierrc/,
  /webpack\.config\.(js|ts)$/,
  /rollup\.config\.(js|ts)$/,
  /babel\.config\.(js|json)$/,
  /moon\.yml$/,
  /\.storybook/,
  /_test_helpers?\.(ts|tsx|js|jsx)$/,
  /test_utils?\.(ts|tsx|js|jsx)$/,
  /testing\.(ts|tsx|js|jsx)$/,
];

// Source code extensions to count
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Cache for dev-only packages/plugins paths
let devOnlyPaths = null;

/**
 * Find all packages/plugins that are dev-only or test-related
 */
function findDevOnlyPaths() {
  if (devOnlyPaths !== null) return devOnlyPaths;

  devOnlyPaths = new Set();

  const findKibanaJsonc = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded directories
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          findKibanaJsonc(fullPath);
        } else if (entry.name === 'kibana.jsonc') {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Remove comments from JSONC
            const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            const parsed = JSON.parse(jsonContent);

            // Check if dev-only or test-related type
            if (
              parsed.devOnly === true ||
              parsed.type === 'test-helper' ||
              parsed.type === 'functional-tests'
            ) {
              devOnlyPaths.add(path.dirname(fullPath));
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  };

  findKibanaJsonc(ROOT_DIR);
  return devOnlyPaths;
}

/**
 * Check if a path is within a dev-only package/plugin
 */
function isInDevOnlyPath(filePath) {
  const devPaths = findDevOnlyPaths();
  for (const devPath of devPaths) {
    if (filePath.startsWith(devPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a directory path contains a test directory
 */
function containsTestDir(pathParts) {
  return pathParts.some((part) => TEST_DIRS.has(part));
}

/**
 * Check if a file should be excluded based on patterns
 */
function isExcludedFile(filename) {
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * Remove comments from source code and count non-empty lines
 */
function countCodeLines(content) {
  // Remove multi-line comments
  let code = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments
  code = code.replace(/\/\/.*$/gm, '');

  // Split into lines and count non-empty ones
  const lines = code.split('\n');
  let count = 0;

  for (const line of lines) {
    // Count non-empty, non-whitespace-only lines
    if (line.trim().length > 0) {
      count++;
    }
  }

  return count;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return countCodeLines(content);
  } catch (e) {
    return 0;
  }
}

/**
 * Recursively walk directories and count code
 */
function walkDirectory(dir, stats, relativeRoot = '') {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(relativeRoot, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }

        // Skip test directories at root level or in specific locations
        const pathParts = relativePath.split(path.sep);
        if (containsTestDir(pathParts)) {
          continue;
        }

        // Skip dev tooling directories
        if (DEV_TOOLING_DIRS.has(entry.name)) {
          continue;
        }

        // Skip dev-only packages/plugins
        if (isInDevOnlyPath(fullPath)) {
          continue;
        }

        walkDirectory(fullPath, stats, relativePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);

        // Only process source code files
        if (!SOURCE_EXTENSIONS.has(ext)) {
          continue;
        }

        // Skip excluded file patterns
        if (isExcludedFile(entry.name)) {
          continue;
        }

        // Skip files in dev-only paths
        if (isInDevOnlyPath(fullPath)) {
          continue;
        }

        const lines = processFile(fullPath);
        stats.totalLines += lines;
        stats.fileCount++;
        stats.byExtension[ext] = (stats.byExtension[ext] || 0) + lines;

        // Track by top-level directory
        const pathParts = relativePath.split(path.sep);
        const topDir = pathParts[0];
        stats.byDirectory[topDir] = (stats.byDirectory[topDir] || 0) + lines;

        // Track by sub-directory (2 levels deep for main directories)
        if (pathParts.length >= 2 && (topDir === 'src' || topDir === 'x-pack')) {
          const subDir = `${topDir}/${pathParts[1]}`;
          stats.bySubDirectory[subDir] = (stats.bySubDirectory[subDir] || 0) + lines;
        }
      }
    }
  } catch (e) {
    // Silently ignore permission errors (likely symlinks or special files)
    if (e.code !== 'EPERM' && e.code !== 'EACCES') {
      console.error(`Error reading directory ${dir}:`, e.message);
    }
  }
}

/**
 * Main execution
 */
function main() {
  if (!JSON_OUTPUT) {
    console.log('Counting application code lines in Kibana repository...\n');
    console.log('Exclusions:');
    console.log('  - Comments (single-line and multi-line)');
    console.log('  - JSON, YAML, and other configuration files');
    console.log('  - Test files (*.test.*, *.spec.*, etc.)');
    console.log('  - Test directories (test/, __tests__/, __fixtures__/, etc.)');
    console.log('  - Dev-only packages/plugins (devOnly: true)');
    console.log('  - Test-helper and functional-tests type packages');
    console.log('  - Storybook files, mock files, type declarations');
    console.log('  - Generated directories (target/, build/, node_modules/)');
    console.log('  - Documentation and examples');
    console.log('  - Development tooling (src/dev/, scripts/)');
    console.log('');
  }

  const stats = {
    totalLines: 0,
    fileCount: 0,
    byExtension: {},
    byDirectory: {},
    bySubDirectory: {}, // More detailed breakdown
  };

  // Find dev-only paths first
  if (!JSON_OUTPUT) {
    console.log('Scanning for dev-only packages/plugins...');
  }
  const devPaths = findDevOnlyPaths();

  if (!JSON_OUTPUT) {
    console.log(`Found ${devPaths.size} dev-only packages/plugins to exclude\n`);

    if (VERBOSE) {
      console.log('Dev-only packages/plugins excluded:');
      const sortedDevPaths = Array.from(devPaths).sort();
      for (const devPath of sortedDevPaths) {
        const relativePath = path.relative(ROOT_DIR, devPath);
        console.log(`  - ${relativePath}`);
      }
      console.log('');
    }

    console.log('Counting lines...\n');
  }

  walkDirectory(ROOT_DIR, stats);

  // Output results
  if (JSON_OUTPUT) {
    const output = {
      totalLines: stats.totalLines,
      totalFiles: stats.fileCount,
      byExtension: stats.byExtension,
      byDirectory: stats.byDirectory,
      bySubDirectory: stats.bySubDirectory,
      excludedDevOnlyPaths: VERBOSE
        ? Array.from(devPaths).map((p) => path.relative(ROOT_DIR, p))
        : undefined,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Print human-readable results
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`\nTotal application code lines: ${stats.totalLines.toLocaleString()}`);
  console.log(`Total source files: ${stats.fileCount.toLocaleString()}`);

  console.log('\n--- By File Extension ---');
  const extSorted = Object.entries(stats.byExtension).sort((a, b) => b[1] - a[1]);
  for (const [ext, lines] of extSorted) {
    console.log(`  ${ext.padEnd(8)} ${lines.toLocaleString().padStart(12)} lines`);
  }

  console.log('\n--- By Top-Level Directory ---');
  const dirSorted = Object.entries(stats.byDirectory).sort((a, b) => b[1] - a[1]);
  for (const [dir, lines] of dirSorted) {
    const percentage = ((lines / stats.totalLines) * 100).toFixed(1);
    console.log(
      `  ${dir.padEnd(20)} ${lines.toLocaleString().padStart(12)} lines (${percentage}%)`
    );
  }

  console.log('\n--- By Sub-Directory (src/ and x-pack/) ---');
  const subDirSorted = Object.entries(stats.bySubDirectory).sort((a, b) => b[1] - a[1]);
  for (const [dir, lines] of subDirSorted.slice(0, 20)) {
    // Top 20 only
    const percentage = ((lines / stats.totalLines) * 100).toFixed(1);
    console.log(
      `  ${dir.padEnd(30)} ${lines.toLocaleString().padStart(12)} lines (${percentage}%)`
    );
  }
  if (subDirSorted.length > 20) {
    console.log(`  ... and ${subDirSorted.length - 20} more sub-directories`);
  }

  console.log('\n' + '='.repeat(60));
}

main();
