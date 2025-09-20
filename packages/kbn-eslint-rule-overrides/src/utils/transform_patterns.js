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

const { transformLiteralPath } = require('./transform_literal_path');
const { removeConsumedSegments } = require('./remove_consumed_segments');

/**
 * Transform files patterns for nested context - excludes entire override if negated pattern matches target
 * @param {string|string[]} patterns - File patterns to transform
 * @param {string} rootDir - Root directory path
 * @param {string} targetDir - Target nested directory path
 * @returns {string[]|null} Transformed patterns array or null if override should be excluded
 */
function transformFilesPatterns(patterns, rootDir, targetDir) {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const transformedPatterns = [];

  for (const pattern of patternArray) {
    try {
      if (!pattern || typeof pattern !== 'string') {
        console.warn(`Invalid pattern encountered: ${pattern}`);
        continue;
      }

      const isNegated = pattern.startsWith('!');
      const cleanPattern = isNegated ? pattern.slice(1) : pattern;

      const expandedPatterns = expandBraces(cleanPattern);

      // For negated FILES patterns, check if ANY expanded pattern would exclude target
      if (isNegated) {
        for (const expandedPattern of expandedPatterns) {
          const relativeTarget = path.relative(rootDir, targetDir);

          // Check if this pattern would exclude the ENTIRE target directory
          // Case 1: Exact match: !src/components
          if (expandedPattern === relativeTarget) {
            return null;
          }

          // Case 2: All files in directory: !src/components/** or !src/components/*
          if (
            expandedPattern === `${relativeTarget}/**` ||
            expandedPattern === `${relativeTarget}/*`
          ) {
            return null;
          }

          // Case 3: Pattern that matches the directory path itself (e.g., !src/comp*)
          const mm = new minimatch.Minimatch(expandedPattern);
          if (mm.match(relativeTarget)) {
            // Only return null if this isn't a pattern for files/subdirs within target
            const isWithinTarget = expandedPattern.startsWith(`${relativeTarget}/`);
            if (!isWithinTarget) {
              return null;
            }
          }

          // Case 4: Pattern that would match ALL files in the target when transformed
          // (e.g., src/**/__tests__/** when we're in __tests__ directory)
          const transformed = transformSinglePattern(expandedPattern, rootDir, targetDir);
          if (transformed === '**' || transformed === '**/*') {
            return null;
          }
        }
        // If we get here, the negation is for specific files/subdirs within target
        // Continue processing normally
      }

      for (const expandedPattern of expandedPatterns) {
        const transformed = transformSinglePattern(expandedPattern, rootDir, targetDir);
        if (transformed) {
          const result = isNegated ? `!${transformed}` : transformed;
          transformedPatterns.push(result);
        }
      }
    } catch (error) {
      console.warn(`Error processing pattern '${pattern}':`, error);
    }
  }

  return transformedPatterns.length > 0 ? transformedPatterns : null;
}

/**
 * Transform excludedFiles patterns for nested context - processes negated patterns normally
 * @param {string|string[]} patterns - File patterns to transform
 * @param {string} rootDir - Root directory path
 * @param {string} targetDir - Target nested directory path
 * @returns {string[]|null} Transformed patterns array or null if not applicable
 */
function transformExcludedFilesPatterns(patterns, rootDir, targetDir) {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const transformedPatterns = [];

  for (const pattern of patternArray) {
    try {
      if (!pattern || typeof pattern !== 'string') {
        console.warn(`Invalid pattern encountered: ${pattern}`);
        continue;
      }

      const isNegated = pattern.startsWith('!');
      const cleanPattern = isNegated ? pattern.slice(1) : pattern;

      const expandedPatterns = expandBraces(cleanPattern);

      // Transform each expanded pattern normally (no special negation handling)
      for (const expandedPattern of expandedPatterns) {
        const transformed = transformSinglePattern(expandedPattern, rootDir, targetDir);
        if (transformed) {
          const result = isNegated ? `!${transformed}` : transformed;
          transformedPatterns.push(result);
        }
      }
    } catch (error) {
      console.warn(`Error processing pattern '${pattern}':`, error);
    }
  }

  return transformedPatterns.length > 0 ? transformedPatterns : null;
}

/**
 * Expand braces in a pattern
 * @param {string} pattern - Pattern to expand
 * @returns {string[]} Expanded patterns
 */
function expandBraces(pattern) {
  try {
    return minimatch.braceExpand(pattern);
  } catch (error) {
    console.warn(`Pattern expansion failed for: ${pattern}`, error);
    return [pattern];
  }
}

/**
 * Transform a single pattern (no brace expansion needed)
 * @param {string} pattern - Single pattern string (already expanded)
 * @param {string} rootDir - Root directory path
 * @param {string} targetDir - Target nested directory path
 * @returns {string|null} Transformed pattern or null if not applicable
 */
function transformSinglePattern(pattern, rootDir, targetDir) {
  const mm = new minimatch.Minimatch(pattern, {
    dot: true,
    matchBase: true,
    magicalBraces: true, // treat braces as magic when .hasMagic is called
    noext: false,
    nocase: process.platform === 'win32',
  });

  // Early optimization for literal patterns
  if (!mm.hasMagic()) {
    return transformLiteralPath(pattern, rootDir, targetDir);
  }

  // Check if pattern could apply using partial matching
  const absoluteTargetDir = path.resolve(targetDir);
  const testPattern = path.resolve(rootDir, pattern);

  const couldApply = minimatch(absoluteTargetDir, testPattern, {
    partial: true,
    matchBase: true,
    dot: true,
    noext: false,
    nocase: process.platform === 'win32',
  });

  if (!couldApply) return null;

  // Calculate relative path and transform
  const relativePath = path.relative(rootDir, targetDir);
  const pathSegments = relativePath ? relativePath.split(path.sep) : [];

  return removeConsumedSegments(pattern, pathSegments);
}

module.exports = {
  transformFilesPatterns,
  transformExcludedFilesPatterns,
  transformSinglePattern,
};
