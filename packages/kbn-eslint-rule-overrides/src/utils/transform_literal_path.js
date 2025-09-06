/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

/**
 * Transform a literal (non-magic) file path
 * @param {string} literalPath - Literal file path
 * @param {string} rootDir - Root directory path
 * @param {string} targetDir - Target nested directory path
 * @returns {string|null} Transformed path or null if not applicable
 */
function transformLiteralPath(literalPath, rootDir, targetDir) {
  const absolutePattern = path.resolve(rootDir, literalPath);
  const absoluteTarget = path.resolve(targetDir);

  // Check if the literal path is within the target directory scope
  if (absolutePattern.startsWith(absoluteTarget + path.sep) || absolutePattern === absoluteTarget) {
    const relativePath = path.relative(absoluteTarget, absolutePattern);
    return relativePath || '.';
  }

  return null;
}

module.exports = {
  transformLiteralPath,
};
