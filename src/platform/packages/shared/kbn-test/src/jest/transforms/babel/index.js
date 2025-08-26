/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const babelJest = require('babel-jest');
const babel = require('@babel/core');
const createTransformerConfig = require('./transformer_config');

// Base transformer from babel-jest
const baseTransformer = babelJest.default.createTransformer(createTransformerConfig());

// Memoize materialized Babel options by (cwd, rootDir) pair to avoid recomputation
const materializedOptionsCache = new Map();

// Use a dummy filename when materializing options so file-specific overrides
// don't alter the cache key. The actual source filename is added separately.
const DUMMY_FILENAME = '__JEST_BABEL_OPTIONS_DUMMY__.js';

// Include this file contents in the cache key like upstream babel-jest
const THIS_FILE = fs.readFileSync(__filename);

/**
 * Materialize Babel options using @babel/core's loadPartialConfig.
 * Returns a stable JSON string of the resolved options.
 */
function getMaterializedBabelOptions({ cwd, rootDir }) {
  const normalizedCwd = path.resolve(cwd || process.cwd());
  const normalizedRoot = path.resolve(rootDir || normalizedCwd);
  const cacheKey = `${normalizedCwd}\n${normalizedRoot}`;

  if (materializedOptionsCache.has(cacheKey)) {
    return materializedOptionsCache.get(cacheKey);
  }

  // Build a base config and materialize with a dummy filename
  const baseConfig = createTransformerConfig();

  let optionsJson = '{}';
  try {
    const partial = babel.loadPartialConfig({
      ...baseConfig,
      cwd: normalizedCwd,
      root: normalizedRoot,
      filename: path.join(normalizedRoot, DUMMY_FILENAME),
    });

    // partial can be null if file is ignored; ensure we stringify options safely
    const options = (partial && partial.options) || baseConfig || {};
    optionsJson = JSON.stringify(options);
  } catch (_e) {
    // Fall back to stringifying base config if materialization fails
    try {
      optionsJson = JSON.stringify(baseConfig || {});
    } catch (_) {
      optionsJson = '{}';
    }
  }

  materializedOptionsCache.set(cacheKey, optionsJson);
  return optionsJson;
}

module.exports = {
  // Preserve all base transformer properties
  ...baseTransformer,

  // Wrap getCacheKey to normalize the config string and rootDir before delegating
  getCacheKey(sourceText, sourcePath, transformOptions) {
    const cfg = (transformOptions && transformOptions.config) || {};
    const normalizedRoot = path.resolve(cfg.rootDir || process.cwd());
    const normalizedCwd = path.resolve(cfg.cwd || normalizedRoot);

    // Resolve materialized Babel options and compute a compact cache key
    const optionsJson = getMaterializedBabelOptions({
      cwd: normalizedCwd,
      rootDir: normalizedRoot,
    });

    const relFile = path.relative(normalizedRoot, path.resolve(sourcePath || ''));

    const hash = crypto.createHash('sha256');
    // File contents of this transformer
    hash.update(THIS_FILE);
    hash.update('\0', 'utf8');
    // Materialized babel options
    hash.update(optionsJson);
    hash.update('\0', 'utf8');
    // Source text
    hash.update(String(sourceText || ''));
    hash.update('\0', 'utf8');
    // Relative filename
    hash.update(relFile);
    hash.update('\0', 'utf8');
    // Instrumentation flag
    if (transformOptions && transformOptions.instrument) {
      hash.update('instrument');
    }
    hash.update('\0', 'utf8');
    // Environment variables
    hash.update(process.env.NODE_ENV || '');
    hash.update('\0', 'utf8');
    hash.update(process.env.BABEL_ENV || '');
    hash.update('\0', 'utf8');
    // Node version
    hash.update(process.version);
    // Truncate to 32 chars to align with prior expectations
    return hash.digest('hex').slice(0, 32);
  },
};
