/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { fileURLToPath } from 'url';
import {
  generateKbnAliases,
  kbnResolverPlugin,
  kbnSpecialModulesPlugin,
  kbnPeggyPlugin,
} from '@kbn/vite-config';
import { jestCompatPlugin, rawTextPlugin } from './plugins';

// =============================================================================
// Shared Types
// =============================================================================

/**
 * Vitest extends Vite's config. This flexible type includes the test property.
 */
interface VitestConfig {
  test?: Record<string, unknown>;
  resolve?: Record<string, unknown>;
  esbuild?: Record<string, unknown>;
  [key: string]: unknown;
}

// =============================================================================
// Main Export: createPluginVitestConfig
// =============================================================================
// This is the primary function most plugin authors should use.

/**
 * Options for createPluginVitestConfig
 */
export interface PluginVitestConfigOptions {
  /**
   * The import.meta.url of the vitest.config.mts file.
   * Used to compute the plugin directory and repo root.
   */
  importMetaUrl: string;

  /**
   * The plugin directory path relative to the repo root.
   * Example: 'x-pack/platform/plugins/shared/streams_app'
   */
  pluginDir: string;

  /**
   * Whether to use jsdom environment (for browser/React tests).
   * Default: true
   */
  jsdom?: boolean;

  /**
   * Test directories to include (relative to pluginDir).
   * Default: ['public', 'common', 'server']
   */
  testDirs?: string[];

  /**
   * Additional setup files to run before tests.
   * Paths are relative to the plugin directory.
   */
  setupFiles?: string[];

  /**
   * Coverage configuration.
   */
  coverage?: {
    /**
     * Whether to collect coverage.
     * Default: false
     */
    enabled?: boolean;

    /**
     * Patterns for files to collect coverage from (relative to pluginDir).
     * Default: ['{public,common,server}/**\/*.{js,ts,tsx}']
     */
    include?: string[];

    /**
     * Coverage reporters to use.
     * Default: ['html']
     */
    reporters?: Array<'html' | 'text' | 'json' | 'lcov' | 'clover'>;
  };

  /**
   * Additional Vite plugins to include.
   */
  extraPlugins?: any[];

  /**
   * Additional resolve aliases.
   */
  extraAliases?: Record<string, string>;
}

/**
 * Creates a complete Vitest configuration for a Kibana plugin.
 * This is a convenience function that handles all the boilerplate configuration.
 *
 * @example
 * ```ts
 * // vitest.config.mts
 * import { createPluginVitestConfig } from '@kbn/vitest';
 *
 * export default createPluginVitestConfig({
 *   importMetaUrl: import.meta.url,
 *   pluginDir: 'x-pack/platform/plugins/shared/streams_app',
 * });
 * ```
 */
export function createPluginVitestConfig(options: PluginVitestConfigOptions): VitestConfig {
  const {
    importMetaUrl,
    pluginDir,
    jsdom = true,
    testDirs = ['public', 'common', 'server'],
    setupFiles = [],
    coverage = {},
    extraPlugins = [],
    extraAliases = {},
  } = options;

  // Compute paths from import.meta.url
  const configFilePath = fileURLToPath(importMetaUrl);
  const packageRoot = Path.dirname(configFilePath);

  // Compute repo root from the plugin directory path
  // pluginDir is relative to repo root, so we can compute repo root from packageRoot
  // e.g., if packageRoot = /repo/x-pack/platform/plugins/shared/streams_app
  //       and pluginDir = x-pack/platform/plugins/shared/streams_app
  //       then repoRoot = /repo
  const pluginDirDepth = pluginDir.split('/').length;
  let repoRoot = packageRoot;
  for (let i = 0; i < pluginDirDepth; i++) {
    repoRoot = Path.dirname(repoRoot);
  }

  // Get the base preset configuration
  const basePreset = createKbnUnitTestPreset({
    repoRoot,
    packageRoot,
    jsdom,
  });

  // Build test include patterns
  const testInclude = testDirs.map((dir) => `${pluginDir}/${dir}/**/*.test.{ts,tsx}`);

  // Resolve setup files to absolute paths
  const resolvedSetupFiles = setupFiles.map((file) => Path.resolve(packageRoot, file));

  // Build coverage configuration
  const coverageConfig = {
    enabled: coverage.enabled ?? false,
    provider: 'v8' as const,
    reportsDirectory: Path.resolve(packageRoot, 'target/coverage'),
    reporter: coverage.reporters ?? ['html'],
    include: (coverage.include ?? ['{public,common,server}/**/*.{js,ts,tsx}']).map(
      (pattern) => `${pluginDir}/${pattern}`
    ),
    exclude: [
      '**/node_modules/**',
      '**/__test__/**',
      '**/__snapshots__/**',
      '**/*.test.{ts,tsx}',
      '**/*.d.ts',
    ],
  };

  return {
    // Set repo root as the project root so Vitest can access setup files
    root: repoRoot,

    // Plugins for module resolution and Jest compatibility
    plugins: [
      // Transform Jest syntax to Vitest syntax for compatibility
      jestCompatPlugin(),
      // Handle .text files as raw text imports (for grok patterns, etc.)
      rawTextPlugin(),
      // Kibana package resolver
      kbnResolverPlugin({ repoRoot }),
      // Handle special modules like zod, vega-lite, etc.
      kbnSpecialModulesPlugin({ repoRoot }),
      // Handle .peggy grammar files
      kbnPeggyPlugin(),
      // Any extra plugins from the caller
      ...extraPlugins,
    ],

    // Allow Vite to serve files from the entire repo
    server: {
      fs: {
        allow: [repoRoot],
      },
      // Don't force re-bundling - use cache
      force: false,
    },

    // Build caching configuration
    build: {
      // Use cached transforms
      commonjsOptions: {
        sourceMap: false,
      },
    },

    // Resolve configuration
    resolve: {
      ...basePreset.resolve,
      alias: {
        ...((basePreset.resolve as any)?.alias || {}),
        // Explicit zod aliases for subpath imports
        'zod/v3': Path.resolve(repoRoot, 'node_modules/zod/v3/index.js'),
        'zod/v4': Path.resolve(repoRoot, 'node_modules/zod/v4/index.js'),
        ...extraAliases,
      },
    },

    // Pre-bundle dependencies for faster startup
    optimizeDeps: {
      // Force pre-bundling these deps (cached after first run)
      include: [
        'zod',
        'zod/v3',
        'zod/v4',
        'react',
        'react-dom',
        'react-dom/client',
        '@testing-library/react',
        '@testing-library/dom',
        '@testing-library/user-event',
        '@emotion/react',
        '@emotion/cache',
      ],
      // Don't force re-optimization on every run
      force: false,
    },

    // esbuild configuration
    esbuild: basePreset.esbuild,

    // Enable caching for faster subsequent runs
    cacheDir: Path.resolve(packageRoot, 'node_modules/.vitest'),

    // Test configuration
    test: {
      ...basePreset.test,
      // Include test files from specified directories only
      include: testInclude,
      // Exclude node_modules, target, and integration tests
      exclude: ['**/node_modules/**', '**/target/**', '**/integration_tests/**'],
      // Additional setup files
      ...(resolvedSetupFiles.length > 0 && {
        setupFiles: [...((basePreset.test as any)?.setupFiles || []), ...resolvedSetupFiles],
      }),
      // Coverage configuration
      coverage: coverageConfig,
      // Reduce memory pressure
      maxConcurrency: 10,
    },
  };
}

// =============================================================================
// Lower-Level Presets
// =============================================================================
// These are building blocks used by createPluginVitestConfig and can be used
// directly for more advanced use cases.

/**
 * Options for the base Vitest preset
 */
export interface KbnVitestPresetOptions {
  /**
   * The root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * The root directory of the package being tested
   */
  packageRoot: string;

  /**
   * Test file patterns to match
   */
  include?: string[];

  /**
   * Test file patterns to exclude
   */
  exclude?: string[];

  /**
   * Whether to use jsdom environment (for browser tests)
   * Default: true
   */
  jsdom?: boolean;

  /**
   * Whether this is an integration test configuration
   * Default: false
   */
  integration?: boolean;

  /**
   * Additional setup files to run before tests
   */
  setupFiles?: string[];

  /**
   * Coverage configuration
   */
  coverage?: {
    enabled?: boolean;
    include?: string[];
    exclude?: string[];
  };
}

/**
 * Creates a Vitest configuration preset for Kibana packages.
 * This mirrors the Jest preset configuration but uses Vitest's architecture.
 */
export function createKbnVitestPreset(options: KbnVitestPresetOptions): VitestConfig {
  const {
    repoRoot,
    packageRoot,
    include = ['**/*.test.{ts,tsx,js,jsx}'],
    exclude = ['**/node_modules/**', '**/target/**', '**/integration_tests/**'],
    jsdom = true,
    integration = false,
    setupFiles = [],
    coverage = {},
  } = options;

  // Generate aliases from the package map
  const kbnAliases = generateKbnAliases(repoRoot);

  // Add special module aliases (similar to Jest resolver)
  const specialAliases: Record<string, string> = {
    // EUI test environment
    '@elastic/eui': Path.resolve(repoRoot, 'node_modules/@elastic/eui/test-env'),
    // Axios CJS build
    axios: Path.resolve(repoRoot, 'node_modules/axios/dist/node/axios.cjs'),
    // Zod v3/v4
    zod: Path.resolve(repoRoot, 'node_modules/zod/v3/index.cjs'),
    'zod/v3': Path.resolve(repoRoot, 'node_modules/zod/v3/index.cjs'),
    'zod/v4': Path.resolve(repoRoot, 'node_modules/zod/v4/index.cjs'),
  };

  // Setup files directory (computed from repoRoot since this is a bundled package)
  const setupDir = getSetupDir(repoRoot);

  // Standard setup files
  const baseSetupFiles = [
    Path.resolve(setupDir, 'polyfills.ts'),
    Path.resolve(setupDir, 'globals.ts'),
    ...(jsdom ? [Path.resolve(setupDir, 'jsdom.ts')] : []),
    ...setupFiles,
  ];

  // Integration test setup
  const integrationSetupFiles = integration ? [Path.resolve(setupDir, 'integration.ts')] : [];

  const config: VitestConfig = {
    test: {
      // Test file patterns
      include: integration ? ['**/integration_tests/**/*.test.{ts,tsx,js,jsx}'] : include,
      exclude,

      // Environment
      environment: jsdom ? 'jsdom' : 'node',

      // Setup files
      setupFiles: [...baseSetupFiles, ...integrationSetupFiles],

      // Globals (vi is always available, but we expose jest-compatible globals)
      globals: true,

      // Timeout (integration tests get more time)
      testTimeout: integration ? 60000 : 10000,

      // Retry on CI
      retry: process.env.CI ? 3 : 0,

      // Reporter configuration
      reporters: [
        'default',
        // JUnit reporter for CI
        ...(process.env.CI
          ? [['junit', { outputFile: Path.resolve(packageRoot, 'target/test-results/junit.xml') }]]
          : []),
      ] as any,

      // Snapshot configuration
      snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true,
      },

      // Coverage configuration
      coverage: {
        enabled: coverage.enabled ?? !!process.env.CODE_COVERAGE,
        provider: 'v8',
        reportsDirectory: Path.resolve(packageRoot, 'target/coverage'),
        reporter: process.env.CODE_COVERAGE ? ['json'] : ['html', 'text'],
        include: coverage.include ?? ['**/*.{ts,tsx,js,jsx}'],
        exclude: coverage.exclude ?? [
          '**/node_modules/**',
          '**/__test__/**',
          '**/__snapshots__/**',
          '**/__examples__/**',
          '**/*mock*/**',
          '**/tests/**',
          '**/test_helpers/**',
          '**/integration_tests/**',
          '**/types/**',
          '**/*.test.{ts,tsx}',
          '**/*.d.ts',
          '**/index.{js,ts,tsx}',
        ],
      },

      // Path aliases
      alias: {
        ...kbnAliases,
        ...specialAliases,
      },

      // Module resolution and dependency optimization
      deps: {
        // Inline modules that need transformation
        inline: [
          /monaco-editor/,
          /monaco-yaml/,
          /langchain/,
          /langsmith/,
          /@langchain/,
          /zod/,
          /vega-interpreter/,
          /vega-util/,
          /vega-tooltip/,
          /@modelcontextprotocol/,
        ],
        // Enable dependency optimization for caching external node_modules
        // Note: @kbn/* packages CANNOT be pre-bundled because they:
        // - Use custom file types (.peggy) that esbuild doesn't handle
        // - Are local workspace packages, not published npm packages
        optimizer: {
          client: {
            enabled: true,
            include: [
              'react',
              'react-dom',
              '@testing-library/react',
              '@testing-library/dom',
              '@emotion/react',
              '@elastic/eui',
            ],
          },
          ssr: {
            enabled: true,
          },
        },
      },

      // Disable unnecessary features for speed
      passWithNoTests: true,

      // Pool configuration - optimized for speed
      pool: 'threads',

      // Run test files in parallel
      fileParallelism: true,

      // Keep isolation for test reliability
      // Note: isolate: false would enable module caching like Jest, but causes
      // test failures due to shared state. Tests would need cleanup improvements.
      isolate: true,

      // Thread pool options (Vitest 4+ uses top-level options)
      singleThread: false,
      useAtomics: true,

      // Watch mode configuration
      watch: !process.env.CI,
      watchExclude: ['**/node_modules/**', '**/target/**', '**/__tmp__/**'],

      // Only run tests related to changed files (faster in watch mode)
      // Use with: vitest --changed
      changed: true,

      // Cache test results to speed up re-runs
      cache: true,

      // Experimental: Persist transformed modules to filesystem
      // This caches Vite transforms (including @kbn/* packages) between runs
      experimental: {
        fsModuleCache: true,
      },
    },

    // Resolve configuration
    resolve: {
      alias: {
        ...kbnAliases,
        ...specialAliases,
      },
    },

    // esbuild configuration for transformation
    esbuild: {
      // Support JSX
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  };

  return config;
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Creates a Vitest preset for unit tests (default)
 */
export function createKbnUnitTestPreset(
  options: Omit<KbnVitestPresetOptions, 'integration'>
): VitestConfig {
  return createKbnVitestPreset({
    ...options,
    integration: false,
  });
}

/**
 * Creates a Vitest preset for integration tests
 */
export function createKbnIntegrationTestPreset(
  options: Omit<KbnVitestPresetOptions, 'integration'>
): VitestConfig {
  return createKbnVitestPreset({
    ...options,
    integration: true,
    exclude: ['**/node_modules/**', '**/target/**'],
    include: ['**/integration_tests/**/*.test.{ts,tsx,js,jsx}'],
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the setup files directory path.
 * Since this package is bundled, we compute the path relative to the repo root.
 */
function getSetupDir(repoRoot: string): string {
  return Path.resolve(repoRoot, 'packages/kbn-vitest/src/setup');
}
