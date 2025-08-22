/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transformFilesPatterns, transformExcludedFilesPatterns } = require('./transform_patterns');

/**
 * Transform ESLint overrides for nested eslint file context
 *
 * @param {Array} overrides - ESLint overrides from root config
 * @param {string} rootDir - Root directory path
 * @param {string} childConfigDir - Child config directory path
 * @param {Function} ruleFilter - Function to filter relevant overrides
 * @returns {Array} Transformed overrides
 */
function transformOverridesForNestedContext(overrides, rootDir, childConfigDir, ruleFilter) {
  const relevantOverrides = overrides.filter(ruleFilter);
  const transformedOverrides = [];

  for (const override of relevantOverrides) {
    try {
      if (!override.files || override.files.length === 0) {
        continue;
      }

      const transformedFiles = transformFilesPatterns(override.files, rootDir, childConfigDir);

      // Skip this override if files pattern doesn't apply or is excluded
      if (!transformedFiles) continue;

      // Build newOverride without excludedFiles initially
      const { excludedFiles, ...overrideWithoutExcludedFiles } = override;

      const newOverride = {
        ...overrideWithoutExcludedFiles,
        files: transformedFiles,
      };

      if (excludedFiles && excludedFiles.length > 0) {
        // Transform excludedFiles patterns
        const transformedExcludedFiles = transformExcludedFilesPatterns(
          excludedFiles,
          rootDir,
          childConfigDir
        );

        // Add excludedFiles only if they exist and were successfully transformed
        if (transformedExcludedFiles && transformedExcludedFiles.length > 0) {
          newOverride.excludedFiles = transformedExcludedFiles;
        }
        // If transformedExcludedFiles is null or empty, excludedFiles won't be added
      }

      transformedOverrides.push(newOverride);
    } catch (error) {
      console.warn(`Error processing override:`, error);
    }
  }

  return transformedOverrides;
}

module.exports = {
  transformOverridesForNestedContext,
};
