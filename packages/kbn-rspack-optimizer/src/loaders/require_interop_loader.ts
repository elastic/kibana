/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * RSPack loader that transforms require() calls to handle ESM/CJS interop.
 *
 * This is a lightweight alternative to babel-plugin-transform-require-default.
 * It transforms:
 *   const foo = require('bar');
 * into:
 *   const foo = __kbnInteropDefault(require('bar'));
 *
 * Where __kbnInteropDefault extracts .default from ES modules:
 *   function __kbnInteropDefault(m) { return m && m.__esModule ? m.default : m; }
 *
 * This handles the case where:
 * - Kibana source code uses CJS require() (like kbn-tinymath)
 * - RSPack resolves to ESM version of the package (due to mainFields: ['browser', 'module', 'main'])
 * - The ESM version has export default which becomes { default: fn } when required
 */

// Regex to match: const/let/var name = require('module')
// Captures: 1=const/let/var, 2=variable name, 3=module name
const REQUIRE_PATTERN = /\b(const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*(['"`])([^'"`]+)\3\s*\)/g;

// Helper function to inject - extracts .default from ES modules
const INTEROP_HELPER = `
function __kbnInteropDefault(m) { return m && m.__esModule ? m.default : m; }
`;

/**
 * Check if source contains require() calls that need transformation
 */
function needsTransform(source: string): boolean {
  return REQUIRE_PATTERN.test(source);
}

/**
 * Transform require() calls to use interop helper
 */
// eslint-disable-next-line import/no-default-export
export default function requireInteropLoader(this: any, source: string): string {
  // Skip if no require() calls
  if (!needsTransform(source)) {
    return source;
  }

  // Reset regex state
  REQUIRE_PATTERN.lastIndex = 0;

  let hasTransformed = false;
  const transformed = source.replace(
    REQUIRE_PATTERN,
    (match, keyword, varName, quote, moduleName) => {
      // Skip Node.js built-ins and relative imports
      if (
        moduleName.startsWith('.') ||
        moduleName.startsWith('node:') ||
        ['fs', 'path', 'os', 'crypto', 'util', 'events', 'stream', 'buffer'].includes(moduleName)
      ) {
        return match;
      }

      hasTransformed = true;
      return `${keyword} ${varName} = __kbnInteropDefault(require(${quote}${moduleName}${quote}))`;
    }
  );

  // Only add helper if we actually transformed something
  if (hasTransformed) {
    // Check if helper already exists (in case of multiple passes)
    if (!source.includes('__kbnInteropDefault')) {
      return INTEROP_HELPER + transformed;
    }
  }

  return transformed;
}
