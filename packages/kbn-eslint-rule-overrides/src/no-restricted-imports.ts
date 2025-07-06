/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import path from 'path';
import minimatch from 'minimatch';
import type { Linter } from 'eslint';
import type {
  RestrictedImportString,
  RestrictedImportPath,
  RestrictedImportOptions,
  NoRestrictedImportsRuleConfig,
  CreateOverrideOptions,
} from './types';

/**
 * Creates an ESLint configuration override for no-restricted-imports rule
 * that merges with existing root configuration and applies to the current directory context.
 */
export function createNoRestrictedImportsOverride(
  options: CreateOverrideOptions = {}
): Linter.ConfigOverride[] {
  // Get root directory using git
  const ROOT_DIR = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
    cwd: __dirname,
  }).trim();

  const ROOT_CLIMB_STRING = path.relative(__dirname, ROOT_DIR); // i.e. '../../..'

  // Load and clone root config
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rootConfig: Linter.Config = require(`${ROOT_CLIMB_STRING}/.eslintrc`);
  const clonedRootConfig: Linter.Config = JSON.parse(JSON.stringify(rootConfig));

  const { restrictedImports = [] } = options;

  if (restrictedImports.length === 0) {
    throw new Error(
      'No restricted imports provided. Please specify at least one import to restrict.'
    );
  }

  // Find overrides with no-restricted-imports rule
  const overridesWithNoRestrictedImportRule = (clonedRootConfig.overrides || []).filter(
    (
      override
    ): override is Linter.ConfigOverride & {
      // fixing bad eslint types that hardcode the optionality of rules type
      rules: {
        'no-restricted-imports': NoRestrictedImportsRuleConfig;
        [key: string]: Linter.RuleEntry;
      };
    } => Boolean(override.rules && 'no-restricted-imports' in override.rules)
  );

  // Process each override
  for (const override of overridesWithNoRestrictedImportRule) {
    const noRestrictedImportsRule = override.rules['no-restricted-imports'];

    // if the rule has options, i.e. ['error', { paths: [...], patterns: [...] }]
    // as opposed to just 'error'
    if (Array.isArray(noRestrictedImportsRule) && noRestrictedImportsRule.length >= 2) {
      const [severity, ...rawOptions] = noRestrictedImportsRule;

      const modernConfig: Required<RestrictedImportOptions> = { paths: [], patterns: [] };

      // Normalize all inputs into modern config format
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && 'name' in opt)) {
          modernConfig.paths.push(opt as RestrictedImportString | RestrictedImportPath);
        } else if (typeof opt === 'object' && ('paths' in opt || 'patterns' in opt)) {
          const optConfig = opt as RestrictedImportOptions;
          if (optConfig.paths) modernConfig.paths.push(...optConfig.paths);
          if (optConfig.patterns) modernConfig.patterns.push(...optConfig.patterns);
        }
      }

      // Remove duplicates and add new restricted imports
      const existingPaths = modernConfig.paths.filter(
        (existing) =>
          !restrictedImports.some((restriction) =>
            typeof existing === 'string'
              ? typeof restriction === 'string'
                ? existing === restriction
                : existing === restriction.name
              : typeof restriction === 'string'
              ? existing.name === restriction
              : existing.name === restriction.name
          )
      );

      const newRuleConfig: NoRestrictedImportsRuleConfig = [
        severity,
        {
          paths: [...existingPaths, ...restrictedImports],
          patterns: modernConfig.patterns,
        },
      ];

      override.rules['no-restricted-imports'] = newRuleConfig;
    }
  }

  function getAssignableDifference(inputPath: string, targetDir: string): string | null {
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

    if (!absoluteTarget.startsWith(absoluteBase)) return null;

    if (isGlob) {
      return remaining || path.normalize('**/*');
    } else {
      const relative = path.relative(absoluteBase, absoluteTarget);
      return relative || '.';
    }
  }

  // Convert file paths to absolute paths
  const absOverrides = overridesWithNoRestrictedImportRule.map((override) => {
    const overrideFiles = typeof override.files === 'string' ? [override.files] : override.files;

    return {
      ...override,
      files: overrideFiles.map((fileOrGlob) => {
        return path.resolve(ROOT_DIR, fileOrGlob);
      }),
    };
  });

  // Filter overrides that apply to current directory
  const inScopeOverrides = absOverrides.map((override) => {
    return {
      ...override,
      files: override.files
        .filter((absPath) => {
          return minimatch(__dirname, path.dirname(absPath), {
            matchBase: true,
            dot: true,
            nocase: true,
          });
        })
        .map((absPath) => {
          return getAssignableDifference(absPath, __dirname);
        })
        .filter((file): file is string => Boolean(file)),
    };
  });

  return inScopeOverrides.filter((override) => override.files.length > 0);
}
