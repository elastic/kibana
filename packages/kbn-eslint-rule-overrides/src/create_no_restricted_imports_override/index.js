/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

const minimatch = require('minimatch');

const { transformSinglePattern } = require('./utils/pattern_transformer');
// eslint-disable-next-line import/no-dynamic-require, @kbn/imports/no_boundary_crossing
const rootConfig = require('../../../../.eslintrc');

const rootDir = path.resolve(__dirname, '..', '..', '..', '..');

/** @type {typeof rootConfig} */
const clonedRootConfig = JSON.parse(JSON.stringify(rootConfig));

/**
 * Transform file patterns (files and excludedFiles) for nested context
 * @param {string|string[]} patterns - File patterns to transform
 * @param {string} rootDir - Root directory path
 * @param {string} targetDir - Target nested directory path
 * @returns {string[]|null} Transformed patterns array or null if not applicable
 */
function transformFilePatterns(patterns, rootDir, targetDir) {
  if (!patterns) return null;

  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const transformedPatterns = [];

  for (const pattern of patternArray) {
    try {
      // Handle empty or invalid patterns
      if (!pattern || typeof pattern !== 'string') {
        console.warn(`Invalid pattern encountered: ${pattern}`);
        continue;
      }

      // Handle negation at top level
      const isNegated = pattern.startsWith('!');
      const cleanPattern = isNegated ? pattern.slice(1) : pattern;

      // Expand braces first (for both positive and negative patterns)
      let expandedPatterns;
      try {
        expandedPatterns = minimatch.braceExpand(cleanPattern);
      } catch (error) {
        console.warn(`Pattern expansion failed for: ${cleanPattern}`, error);
        expandedPatterns = [cleanPattern];
      }

      // For negated patterns, check if ANY expanded pattern would exclude target
      if (isNegated) {
        const shouldExcludeOverride = false;

        for (const expandedPattern of expandedPatterns) {
          const wouldMatch = minimatch(targetDir, path.resolve(rootDir, expandedPattern), {
            partial: true,
            matchBase: true,
            dot: true,
            nocase: process.platform === 'win32',
          });

          if (wouldMatch) {
            // This negated pattern excludes our target directory
            // Return null to exclude the entire override
            return null;
          }
        }

        // None of the expanded patterns exclude target, transform each
        for (const expandedPattern of expandedPatterns) {
          const transformed = transformSinglePattern(expandedPattern, rootDir, targetDir);
          if (transformed) {
            transformedPatterns.push(`!${transformed}`);
          }
        }
      } else {
        // Positive patterns - transform each expanded pattern
        for (const expandedPattern of expandedPatterns) {
          const transformed = transformSinglePattern(expandedPattern, rootDir, targetDir);
          if (transformed) {
            transformedPatterns.push(transformed);
          }
        }
      }
    } catch (error) {
      console.warn(`Error processing pattern '${pattern}':`, error);
      // Continue processing other patterns
    }
  }

  return transformedPatterns.length > 0 ? transformedPatterns : null;
}

/**
 * Creates an ESLint configuration override for no-restricted-imports rule
 * that merges with existing root configuration and applies to the current directory context.
 * @param {CreateOverrideOptions} options - Configuration options
 * @returns {Array<Object>} Array of ESLint override configurations
 */
function createNoRestrictedImportsOverride(options = {}) {
  const { restrictedImports = [], childConfigDir } = options;

  // Validate inputs
  if (!childConfigDir) {
    throw new Error(
      'No childConfigDir provided. Please pass __dirname in your nested .eslintrc.js file.'
    );
  }

  if (!restrictedImports || restrictedImports.length === 0) {
    throw new Error(
      'No restricted imports provided. Please specify at least one import to restrict.'
    );
  }

  const overridesWithNoRestrictedImportRule = (clonedRootConfig.overrides || []).filter(
    (override) => Boolean(override.rules && 'no-restricted-imports' in override.rules)
  );

  // Process and merge restricted imports into existing rules
  for (const override of overridesWithNoRestrictedImportRule) {
    const noRestrictedImportsRule = override.rules['no-restricted-imports'];

    if (Array.isArray(noRestrictedImportsRule) && noRestrictedImportsRule.length >= 2) {
      const [severity, ...rawOptions] = noRestrictedImportsRule;

      const modernConfig = { paths: [], patterns: [] };

      // Normalize all inputs into modern config format
      for (const opt of rawOptions) {
        if (typeof opt === 'string' || (typeof opt === 'object' && opt && 'name' in opt)) {
          modernConfig.paths.push(opt);
        } else if (typeof opt === 'object' && opt && ('paths' in opt || 'patterns' in opt)) {
          const optConfig = opt;
          if (optConfig.paths) modernConfig.paths.push(...optConfig.paths);
          if (optConfig.patterns) modernConfig.patterns.push(...optConfig.patterns);
        }
      }

      // Remove duplicates and add new restricted imports
      const existingPaths = modernConfig.paths.filter(
        (existing) =>
          !restrictedImports.some((restriction) => {
            if (typeof existing === 'string') {
              return typeof restriction === 'string'
                ? existing === restriction
                : existing === restriction.name;
            } else if (existing && typeof existing === 'object' && 'name' in existing) {
              return typeof restriction === 'string'
                ? existing.name === restriction
                : existing.name === restriction.name;
            }
            return false;
          })
      );

      const newRuleConfig = [
        severity,
        {
          paths: [...existingPaths, ...restrictedImports],
          patterns: modernConfig.patterns,
        },
      ];

      override.rules['no-restricted-imports'] = newRuleConfig;
    }
  }

  // Transform file patterns for nested context
  const transformedOverrides = [];

  for (const override of overridesWithNoRestrictedImportRule) {
    try {
      // Transform both files and excludedFiles patterns
      const transformedFiles = transformFilePatterns(override.files, rootDir, childConfigDir);
      const transformedExcludedFiles = transformFilePatterns(
        override.excludedFiles,
        rootDir,
        childConfigDir
      );

      // Skip this override if files pattern doesn't apply
      if (!transformedFiles) continue;

      const newOverride = {
        ...override,
        files: transformedFiles,
      };

      // Add excludedFiles only if they exist and were successfully transformed
      if (transformedExcludedFiles) {
        newOverride.excludedFiles = transformedExcludedFiles;
      }

      transformedOverrides.push(newOverride);
    } catch (error) {
      console.warn(`Error processing override:`, error);
      // Continue processing other overrides
    }
  }

  return transformedOverrides;
}

module.exports = {
  createNoRestrictedImportsOverride,
};
