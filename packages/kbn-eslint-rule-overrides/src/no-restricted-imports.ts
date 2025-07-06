/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import type { Linter } from 'eslint';
import minimatch from 'minimatch';
import type {
  RestrictedImportString,
  RestrictedImportPath,
  RestrictedImportOptions,
  NoRestrictedImportsRuleConfig,
  CreateOverrideOptions,
} from './types';

/**
 * Creates ESLint override configuration for no-restricted-imports rule.
 * This function intelligently merges additional restrictions with existing ones
 * from the root config and filters overrides based on the calling directory.
 */
export function createNoRestrictedImportsOverride(
  callingDirectory: string,
  options: CreateOverrideOptions = {}
): Linter.Config {
  const {
    additionalRestrictedImports = [],
    rootDir = process.cwd(),
    rootConfigPath = path.join(rootDir, '.eslintrc.js'),
    mergeWithExisting = true,
    overrideFilter,
  } = options;

  // Load and clone the root config
  const rootConfig = loadRootConfig(rootConfigPath);
  const clonedConfig = JSON.parse(JSON.stringify(rootConfig));

  // Find overrides with no-restricted-imports rule
  const relevantOverrides = clonedConfig.overrides.filter(
    (override: Linter.ConfigOverride<Linter.RulesRecord>) => {
      if (overrideFilter) {
        return overrideFilter(override);
      }
      return override.rules && 'no-restricted-imports' in override.rules;
    }
  );

  // Process each override
  for (const override of relevantOverrides) {
    const rule = override.rules!['no-restricted-imports'] as NoRestrictedImportsRuleConfig;

    if (Array.isArray(rule) && rule.length >= 2) {
      const [severity, ...rawOptions] = rule;
      const modernConfig = normalizeToModernConfig(rawOptions);

      if (mergeWithExisting) {
        // Merge additional restrictions, removing duplicates
        const mergedPaths = mergeRestrictedPaths(
          modernConfig.paths || [],
          additionalRestrictedImports
        );
        modernConfig.paths = mergedPaths;
      } else {
        // Replace with only additional restrictions
        modernConfig.paths = additionalRestrictedImports;
      }

      // Update the rule configuration
      override.rules!['no-restricted-imports'] = [severity, modernConfig];
    }
  }

  // Convert file paths to be relative to calling directory
  const scopedOverrides = getScopedOverrides(relevantOverrides, rootDir, callingDirectory);

  return {
    overrides: scopedOverrides,
  };
}

/**
 * Loads the root ESLint configuration.
 */
function loadRootConfig(configPath: string): Linter.Config {
  try {
    return require(configPath);
  } catch (error) {
    throw new Error(`Failed to load root ESLint config from ${configPath}: ${error}`);
  }
}

/**
 * Normalizes various input formats into the modern RestrictedImportOptions format.
 */
function normalizeToModernConfig(rawOptions: any[]): RestrictedImportOptions {
  const modernConfig: RestrictedImportOptions = { paths: [], patterns: [] };

  for (const opt of rawOptions) {
    if (typeof opt === 'string' || (typeof opt === 'object' && 'name' in opt)) {
      // It's a path restriction
      modernConfig.paths!.push(opt);
    } else if (typeof opt === 'object' && ('paths' in opt || 'patterns' in opt)) {
      // It's already in modern format
      if (opt.paths) {
        modernConfig.paths!.push(...opt.paths);
      }
      if (opt.patterns) {
        modernConfig.patterns!.push(...opt.patterns);
      }
    } else if (typeof opt === 'object' && ('group' in opt || 'regex' in opt)) {
      // It's a pattern restriction
      modernConfig.patterns!.push(opt);
    }
  }

  return modernConfig;
}

/**
 * Merges additional restricted paths with existing ones, removing duplicates.
 */
function mergeRestrictedPaths(
  existingPaths: Array<RestrictedImportString | RestrictedImportPath>,
  additionalPaths: Array<RestrictedImportString | RestrictedImportPath>
): Array<RestrictedImportString | RestrictedImportPath> {
  const getPathName = (restrictedPath: RestrictedImportString | RestrictedImportPath): string => {
    return typeof restrictedPath === 'string' ? restrictedPath : restrictedPath.name;
  };

  const additionalPathNames = new Set(additionalPaths.map(getPathName));

  // Filter out existing paths that would be duplicates
  const filteredExisting = existingPaths.filter(
    (existing) => !additionalPathNames.has(getPathName(existing))
  );

  return [...filteredExisting, ...additionalPaths];
}

/**
 * Filters and transforms overrides to be scoped to the calling directory.
 */
function getScopedOverrides(
  overrides: Array<Linter.ConfigOverride<Linter.RulesRecord>>,
  rootDir: string,
  callingDirectory: string
): Array<Linter.ConfigOverride<Linter.RulesRecord>> {
  const scopedOverrides: Array<Linter.ConfigOverride<Linter.RulesRecord>> = [];

  for (const override of overrides) {
    const files = Array.isArray(override.files) ? override.files : [override.files || ''];
    const scopedFiles = getScopedFiles(files, rootDir, callingDirectory);

    if (scopedFiles.length > 0) {
      scopedOverrides.push({
        ...override,
        files: scopedFiles,
      });
    }
  }

  return scopedOverrides;
}

/**
 * Transforms file patterns to be relative to the calling directory.
 */
function getScopedFiles(files: string[], rootDir: string, callingDirectory: string): string[] {
  const absoluteFiles = files.map((fileOrGlob) => path.resolve(rootDir, fileOrGlob));

  const scopedFiles = absoluteFiles
    .filter((absPath) => {
      // Check if calling directory matches the pattern's directory
      return minimatch(callingDirectory, path.dirname(absPath), {
        matchBase: true,
        dot: true,
        nocase: process.platform === 'win32',
      });
    })
    .map((absPath) => getRelativePattern(absPath, callingDirectory))
    .filter((pattern): pattern is string => pattern !== null);

  return scopedFiles;
}

/**
 * Calculates the relative pattern from an absolute path to a target directory.
 */
function getRelativePattern(inputPath: string, targetDir: string): string | null {
  const absoluteTarget = path.resolve(targetDir);
  const isGlob = inputPath.includes('**');

  let base: string;
  let remaining: string;

  if (isGlob) {
    const globIndex = inputPath.indexOf('**');
    base = inputPath.slice(0, globIndex).replace(/[\\/]+$/, '');
    remaining = inputPath.slice(globIndex);
  } else {
    base = inputPath;
    remaining = '';
  }

  const absoluteBase = path.resolve(base);

  // Check if target is within base path
  if (!absoluteTarget.startsWith(absoluteBase)) {
    return null;
  }

  if (isGlob) {
    return remaining || path.normalize('**/*');
  } else {
    const relative = path.relative(absoluteBase, absoluteTarget);
    return relative || '.';
  }
}
