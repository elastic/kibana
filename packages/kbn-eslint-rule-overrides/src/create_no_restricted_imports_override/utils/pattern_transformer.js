/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const minimatch = require('minimatch');
const path = require('path');
const { transformLiteralPath } = require('./literal_path_transformer');
const { removeConsumedSegments } = require('./segment_matcher');

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
    magicalBraces: true,
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

// Remove the old transformPatternForNestedContext function entirely
module.exports = {
  transformSinglePattern,
};
