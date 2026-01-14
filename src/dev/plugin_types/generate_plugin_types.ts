/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Plugin search directories (relative to repo root).
 */
const PLUGIN_SEARCH_DIRS = [
  'src/platform/plugins/private',
  'src/platform/plugins/shared',
  'x-pack/platform/plugins/private',
  'x-pack/platform/plugins/shared',
  'x-pack/solutions/observability/plugins',
  'x-pack/solutions/security/plugins',
  'x-pack/solutions/search/plugins',
];

/**
 * Kibana license header for generated files.
 */
const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
`;

/**
 * Test-only packages that should be excluded from public API.
 */
const TEST_PACKAGES = [
  '@testing-library/react',
  '@testing-library/dom',
  '@testing-library/jest-dom',
  'enzyme',
  'jest',
  '@jest/globals',
];

/**
 * Node.js built-in modules.
 */
const NODE_BUILTINS = [
  'events',
  'fs',
  'path',
  'http',
  'https',
  'tls',
  'stream',
  'buffer',
  'util',
  'url',
  'crypto',
  'os',
  'child_process',
  'net',
  'perf_hooks',
];

/**
 * Common transitive dependencies from `@kbn/core` (shared by both public and server).
 * These are packages that `@kbn/*` packages re-export or use in their public APIs,
 * so they need to be externalized rather than inlined.
 */
const COMMON_IMPORTED_LIBRARIES = [
  '@elastic/ebt',
  '@elastic/ecs',
  '@elastic/elasticsearch', // estypes namespace, SearchResponse, etc.
  '@elastic/eui',
  '@elastic/transport',
  '@openfeature/core',
  'events',
  'http',
  'inversify',
  'joi',
  'moment',
  'openapi-types',
  'rxjs',
  'tls',
  'utility-types', // Assign, etc.
];

/**
 * Additional transitive dependencies for public/browser builds.
 */
const PUBLIC_IMPORTED_LIBRARIES = [
  ...COMMON_IMPORTED_LIBRARIES,
  '@openfeature/web-sdk',
  'history',
  'react',
  'react-dom',
  'react-intl', // IntlShape, etc.
  'react-router-dom',
];

/**
 * Additional transitive dependencies for server builds.
 */
const SERVER_IMPORTED_LIBRARIES = [
  ...COMMON_IMPORTED_LIBRARIES,
  '@hapi/boom',
  '@hapi/hapi',
  '@openfeature/server-sdk',
  'elastic-apm-node',
  'perf_hooks',
  'stream',
];

interface CategorizedPackages {
  npm: string[];
  kbn: string[];
  elastic: string[];
  node: string[];
  test: string[];
}

interface TargetInfo {
  target: string;
  entryFile: string;
  entryFileName: string;
}

interface DtsBundleConfig {
  compilationOptions: {
    preferredConfigPath: string;
  };
  entries: Array<{
    filePath: string;
    outFile: string;
    libraries: {
      inlinedLibraries: string[];
      importedLibraries: string[];
    };
    output: {
      sortNodes: boolean;
      exportReferencedTypes: boolean;
      noBanner: boolean;
    };
    failOnClass: boolean;
  }>;
}

/**
 * Find a plugin by name in known directories.
 */
const findPluginByName = (pluginName: string): string | null => {
  for (const searchDir of PLUGIN_SEARCH_DIRS) {
    const candidatePath = path.resolve(REPO_ROOT, searchDir, pluginName);
    if (fs.existsSync(candidatePath)) {
      const hasKibanaJsonc = fs.existsSync(path.join(candidatePath, 'kibana.jsonc'));
      const hasKibanaJson = fs.existsSync(path.join(candidatePath, 'kibana.json'));
      if (hasKibanaJsonc || hasKibanaJson) {
        return candidatePath;
      }
    }
  }
  return null;
};

/**
 * Resolve plugin path from name or path argument.
 */
const resolvePluginPath = (pluginArg: string): string | null => {
  if (pluginArg.includes('/') || pluginArg.includes('\\')) {
    const resolvedPath = path.isAbsolute(pluginArg)
      ? pluginArg
      : path.resolve(REPO_ROOT, pluginArg);

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    return null;
  }

  return findPluginByName(pluginArg);
};

/**
 * Extract all import statements from a file.
 */
const extractImports = (content: string): Set<string> => {
  const imports = new Set<string>();

  const importRegex =
    /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  const exportRegex = /export\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = exportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return imports;
};

/**
 * Recursively find all TypeScript files in a directory.
 */
const findTsFiles = (dir: string, files: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.includes('node_modules') &&
      !entry.name.includes('target')
    ) {
      findTsFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  return files;
};

/**
 * Get the base package name from an import path.
 */
const getPackageName = (importPath: string): string | null => {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  if (importPath === 'src' || importPath.startsWith('src/')) {
    return null;
  }

  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
  }

  return importPath.split('/')[0];
};

/**
 * Categorize packages by type.
 */
const categorizePackages = (packages: string[]): CategorizedPackages => {
  const npm: string[] = [];
  const kbn: string[] = [];
  const elastic: string[] = [];
  const node: string[] = [];
  const test: string[] = [];

  for (const pkg of packages) {
    if (TEST_PACKAGES.includes(pkg)) {
      test.push(pkg);
      continue;
    }

    if (pkg.startsWith('@kbn/')) {
      kbn.push(pkg);
    } else if (pkg.startsWith('@elastic/')) {
      elastic.push(pkg);
    } else if (NODE_BUILTINS.includes(pkg)) {
      node.push(pkg);
    } else {
      npm.push(pkg);
    }
  }

  return {
    npm: npm.sort(),
    kbn: kbn.sort(),
    elastic: elastic.sort(),
    node: node.sort(),
    test: test.sort(),
  };
};

/**
 * Get the config file path for a target.
 */
const getConfigPath = (typesDir: string, target: string): string => {
  return path.resolve(typesDir, `generate_${target}.json`);
};

/**
 * Get the source directories for a target.
 */
const getSourceDirs = (pluginRoot: string, target: string): string[] => {
  const dirs = [path.resolve(pluginRoot, target)];
  const commonDir = path.resolve(pluginRoot, 'common');
  if (fs.existsSync(commonDir)) {
    dirs.push(commonDir);
  }
  return dirs;
};

/**
 * Load current `importedLibraries` from config.
 */
const loadCurrentConfig = (typesDir: string, target: string): Set<string> => {
  try {
    const configPath = getConfigPath(typesDir, target);
    const config: DtsBundleConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return new Set(config.entries[0].libraries.importedLibraries);
  } catch {
    return new Set();
  }
};

/**
 * Analyze source files for imports.
 */
const analyzeSourceFiles = (log: ToolingLog, pluginRoot: string, target: string): Set<string> => {
  log.info(`Analyzing source files for ${target}...`);

  const sourceDirs = getSourceDirs(pluginRoot, target);
  const allImports = new Set<string>();
  let fileCount = 0;

  for (const dir of sourceDirs) {
    const files = findTsFiles(dir);
    fileCount += files.length;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      imports.forEach((imp) => allImports.add(imp));
    }
  }

  log.debug(`Scanned ${fileCount} source files.`);

  const packages = new Set<string>();
  for (const imp of allImports) {
    const pkg = getPackageName(imp);
    if (pkg) {
      packages.add(pkg);
    }
  }

  return packages;
};

/**
 * Get the default imported libraries for a target.
 */
const getDefaultImportedLibraries = (target: string): string[] => {
  return target === 'server' ? SERVER_IMPORTED_LIBRARIES : PUBLIC_IMPORTED_LIBRARIES;
};

/**
 * Create a new config file for a target.
 */
const createConfigFile = (
  log: ToolingLog,
  pluginRoot: string,
  typesDir: string,
  target: string,
  importedLibraries: string[] | null,
  entryFileName: string = 'plugin.ts'
): string => {
  const libs = importedLibraries || getDefaultImportedLibraries(target);
  const configPath = getConfigPath(typesDir, target);
  const config: DtsBundleConfig = {
    compilationOptions: {
      preferredConfigPath: './tsconfig.bundle.json',
    },
    entries: [
      {
        filePath: `../${target}/${entryFileName}`,
        outFile: `./plugin_${target}.d.ts`,
        libraries: {
          inlinedLibraries: [],
          importedLibraries: [...libs].sort(),
        },
        output: {
          sortNodes: true,
          exportReferencedTypes: false,
          noBanner: true,
        },
        failOnClass: false,
      },
    ],
  };

  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  log.success(`Created ${path.relative(pluginRoot, configPath)}`);

  return configPath;
};

/**
 * Update an existing config file with the recommended list.
 */
const updateConfigFile = (
  log: ToolingLog,
  pluginRoot: string,
  typesDir: string,
  target: string,
  recommended: string[]
): void => {
  const configPath = getConfigPath(typesDir, target);

  try {
    const config: DtsBundleConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const oldList = config.entries[0].libraries.importedLibraries;

    config.entries[0].libraries.importedLibraries = recommended;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    log.success(`Updated ${path.relative(pluginRoot, configPath)}`);
    log.indent(2, () => {
      log.info(`Previous: ${oldList.length} packages`);
      log.info(`New: ${recommended.length} packages`);
    });
  } catch (err) {
    log.error(`Failed to update config for ${target}: ${(err as Error).message}`);
  }
};

/**
 * Analyze a single target and optionally update its config.
 */
const analyzeTarget = (
  log: ToolingLog,
  pluginRoot: string,
  typesDir: string,
  target: string,
  updateConfig: boolean
): string[] => {
  const packages = analyzeSourceFiles(log, pluginRoot, target);
  const categorized = categorizePackages([...packages]);
  const currentConfig = loadCurrentConfig(typesDir, target);

  log.info(`NPM Packages (${categorized.npm.length}):`);
  categorized.npm.forEach((pkg) => {
    const inConfig = currentConfig.has(pkg) ? '✓' : '✗ MISSING';
    log.info(`  "${pkg}", ${inConfig}`);
  });

  log.info(`@elastic/* Packages (${categorized.elastic.length}):`);
  categorized.elastic.forEach((pkg) => {
    const inConfig = currentConfig.has(pkg) ? '✓' : '✗ MISSING';
    log.info(`  "${pkg}", ${inConfig}`);
  });

  log.info(`@kbn/* Packages (${categorized.kbn.length}):`);
  categorized.kbn.forEach((pkg) => {
    const inConfig = currentConfig.has(pkg) ? '✓' : '✗ MISSING';
    log.info(`  "${pkg}", ${inConfig}`);
  });

  log.info(`Node.js Modules (${categorized.node.length}):`);
  categorized.node.forEach((pkg) => {
    const inConfig = currentConfig.has(pkg) ? '✓' : '✗ MISSING';
    log.info(`  "${pkg}", ${inConfig}`);
  });

  if (categorized.test.length > 0) {
    log.info(`Test Packages (${categorized.test.length}) - EXCLUDED:`);
    categorized.test.forEach((pkg) => {
      log.info(`  "${pkg}"`);
    });
  }

  const defaultLibs = getDefaultImportedLibraries(target);
  const directImports = [...categorized.npm, ...categorized.elastic, ...categorized.node];
  const recommended = [...new Set([...directImports, ...defaultLibs])].sort();

  log.info('');
  log.info(`Summary for ${target}:`);
  log.info(`  Direct imports: ${packages.size}`);
  log.info(`    NPM: ${categorized.npm.length}`);
  log.info(`    @elastic/*: ${categorized.elastic.length}`);
  log.info(`    @kbn/*: ${categorized.kbn.length} (will be inlined)`);
  log.info(`    Node.js: ${categorized.node.length}`);
  log.info(`  Current importedLibraries: ${currentConfig.size}`);
  log.info(`  Recommended importedLibraries: ${recommended.length}`);

  const missing = recommended.filter((pkg) => !currentConfig.has(pkg));
  const extra = [...currentConfig].filter((pkg) => !recommended.includes(pkg));

  if (missing.length > 0) {
    log.warning(`Missing from config (${missing.length}):`);
    missing.forEach((pkg) => log.info(`  + "${pkg}"`));
  }

  if (extra.length > 0) {
    log.info(`Extra in config (${extra.length}):`);
    extra.forEach((pkg) => log.info(`  - "${pkg}"`));
  }

  if (missing.length === 0 && extra.length === 0) {
    log.success('Config is up to date.');
  }

  if (updateConfig) {
    updateConfigFile(log, pluginRoot, typesDir, target, recommended);
  }

  return recommended;
};

/**
 * Add license header to a generated `.d.ts` file.
 */
const addLicenseHeader = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  if (content.startsWith('/*\n * Copyright Elasticsearch')) {
    return false;
  }

  const newContent = LICENSE_HEADER + content;
  fs.writeFileSync(filePath, newContent);
  return true;
};

/**
 * Run `dts-bundle-generator` for a target and add license header.
 */
const generateTypes = (
  log: ToolingLog,
  pluginRoot: string,
  typesDir: string,
  target: string
): boolean => {
  const configPath = getConfigPath(typesDir, target);
  const outputPath = path.resolve(typesDir, `plugin_${target}.d.ts`);

  if (!fs.existsSync(configPath)) {
    log.error(`Config not found: ${path.relative(pluginRoot, configPath)}`);
    log.error('Run without --generate first to create the config.');
    return false;
  }

  log.info(`Generating types for ${target}...`);

  let generatorFailed = false;

  try {
    const configRelPath = path.relative(pluginRoot, configPath);
    execSync(`npx dts-bundle-generator --config ${configRelPath} --no-check`, {
      cwd: pluginRoot,
      stdio: 'inherit',
    });
  } catch {
    generatorFailed = true;
    log.warning('dts-bundle-generator reported errors (output may still be valid)');
  }

  if (fs.existsSync(outputPath)) {
    if (addLicenseHeader(outputPath)) {
      log.success(`Added license header to ${path.relative(pluginRoot, outputPath)}`);
    }
    return true;
  }

  if (generatorFailed) {
    log.error(`Failed to generate types for ${target}`);
  }
  return !generatorFailed;
};

/**
 * Ensure the types directory and `tsconfig.bundle.json` exist.
 */
const ensureTypesDir = (log: ToolingLog, typesDir: string): void => {
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
    log.success('Created types/ directory');
  }

  const tsconfigBundlePath = path.resolve(typesDir, 'tsconfig.bundle.json');
  const tsconfigBundle = {
    extends: '../tsconfig.json',
    compilerOptions: {
      noEmit: true,
      skipLibCheck: true,
      declaration: true,
    },
  };

  const existingContent = fs.existsSync(tsconfigBundlePath)
    ? fs.readFileSync(tsconfigBundlePath, 'utf-8')
    : null;
  const newContent = JSON.stringify(tsconfigBundle, null, 2) + '\n';

  if (existingContent !== newContent) {
    fs.writeFileSync(tsconfigBundlePath, newContent);
    log.success(`${existingContent ? 'Updated' : 'Created'} types/tsconfig.bundle.json`);
  }
};

/**
 * Get valid targets (those with entry files).
 */
const getValidTargets = (
  log: ToolingLog,
  pluginRoot: string,
  requestedTargets: string[]
): TargetInfo[] => {
  const valid: TargetInfo[] = [];

  for (const target of requestedTargets) {
    const entryFileTs = path.resolve(pluginRoot, target, 'plugin.ts');
    const entryFileTsx = path.resolve(pluginRoot, target, 'plugin.tsx');
    const entryFile = fs.existsSync(entryFileTs)
      ? entryFileTs
      : fs.existsSync(entryFileTsx)
      ? entryFileTsx
      : null;

    if (entryFile) {
      valid.push({ target, entryFile, entryFileName: path.basename(entryFile) });
    } else {
      log.warning(`Skipping ${target}: ${target}/plugin.ts(x) not found`);
    }
  }
  return valid;
};

run(
  async ({ log, flagsReader }) => {
    const pluginArg = flagsReader.getPositionals()[0];
    const updateConfig = flagsReader.boolean('update');
    const targetPublic = flagsReader.boolean('public');
    const targetServer = flagsReader.boolean('server');
    const generate = flagsReader.boolean('generate');

    if (!pluginArg) {
      throw new Error(
        'Plugin name or path is required.\n' +
          'Usage: node scripts/generate_plugin_types.js <plugin-name-or-path> [options]\n' +
          'Examples:\n' +
          '  node scripts/generate_plugin_types.js expressions\n' +
          '  node scripts/generate_plugin_types.js expressions --server --update'
      );
    }

    const pluginRoot = resolvePluginPath(pluginArg);

    if (!pluginRoot) {
      throw new Error(
        `Plugin not found: ${pluginArg}\n` +
          'Searched in:\n' +
          PLUGIN_SEARCH_DIRS.map((dir) => `  - ${dir}`).join('\n')
      );
    }

    const typesDir = path.resolve(pluginRoot, 'types');

    // Determine targets. If neither --public nor --server is specified, target both.
    const requestedTargets: string[] = [];
    if (!targetPublic && !targetServer) {
      requestedTargets.push('public', 'server');
    } else {
      if (targetPublic) {
        requestedTargets.push('public');
      }
      if (targetServer) {
        requestedTargets.push('server');
      }
    }

    log.info(`Plugin: ${path.relative(REPO_ROOT, pluginRoot)}`);

    ensureTypesDir(log, typesDir);

    const validTargets = getValidTargets(log, pluginRoot, requestedTargets);

    if (validTargets.length === 0) {
      throw new Error('No valid targets found.');
    }

    if (generate) {
      for (const { target } of validTargets) {
        generateTypes(log, pluginRoot, typesDir, target);
      }
      return;
    }

    for (const { target, entryFileName } of validTargets) {
      const configPath = getConfigPath(typesDir, target);
      if (!fs.existsSync(configPath)) {
        log.info(`Creating config for ${target}...`);
        createConfigFile(log, pluginRoot, typesDir, target, null, entryFileName);
      }

      analyzeTarget(log, pluginRoot, typesDir, target, updateConfig);
    }

    log.info('');
    log.info('To generate .d.ts files:');
    log.info('Run with --generate flag, or manually:');
    const relPluginPath = path.relative(REPO_ROOT, pluginRoot);
    for (const { target } of validTargets) {
      const configPath = getConfigPath(typesDir, target);
      if (fs.existsSync(configPath)) {
        log.info(
          `  cd ${relPluginPath} && npx dts-bundle-generator --config types/generate_${target}.json --no-check`
        );
      }
    }
  },
  {
    description: 'Analyze and generate type declarations for a Kibana plugin',
    usage: 'node scripts/generate_plugin_types.js <plugin-name-or-path> [options]',
    flags: {
      boolean: ['public', 'server', 'update', 'generate'],
      help: `
        --public     Target public/plugin.ts
        --server     Target server/plugin.ts
        --update     Update the config's importedLibraries with recommendations
        --generate   Run dts-bundle-generator and add license header
      `,
    },
  }
);
