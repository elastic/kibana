/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const babelJest = require('babel-jest');
const createTransformerConfig = require('./transformer_config');

// Base transformer from babel-jest
const baseTransformer = babelJest.default.createTransformer(createTransformerConfig());

// Normalize the Jest config JSON string used in hashing:
// - resolve rootDir to absolute
// - drop roots entirely
function normalizeConfigString(configString) {
  if (typeof configString !== 'string') return configString;
  try {
    const cfg = JSON.parse(configString);
    if (cfg && typeof cfg === 'object') {
      if (cfg.rootDir) {
        try {
          cfg.rootDir = path.resolve(cfg.rootDir);
        } catch (_) {
          // ignore
        }
      }
      if ('roots' in cfg) {
        delete cfg.roots;
      }
    }
    return JSON.stringify(cfg);
  } catch (_) {
    return configString;
  }
}

module.exports = {
  // Preserve all base transformer properties
  ...baseTransformer,

  // Wrap getCacheKey to normalize the config string and rootDir before delegating
  getCacheKey(sourceText, sourcePath, transformOptions) {
    const normalizedConfigString = normalizeConfigString(
      transformOptions && transformOptions.configString
    );

    // derive absolute rootDir if present in configString
    let derivedRootDir;
    try {
      const parsed =
        typeof normalizedConfigString === 'string' ? JSON.parse(normalizedConfigString) : undefined;
      if (parsed && parsed.rootDir) {
        derivedRootDir = path.resolve(parsed.rootDir);
      }
    } catch (_) {
      // ignore
    }

    const normalizedTransformOptions = {
      ...(transformOptions || {}),
      configString: normalizedConfigString,
      config: {
        // ensure config exists and has cwd/rootDir for babel-jest
        cwd:
          derivedRootDir ||
          (transformOptions && transformOptions.config && transformOptions.config.cwd) ||
          process.cwd(),
        rootDir:
          derivedRootDir ||
          (transformOptions && transformOptions.config && transformOptions.config.rootDir) ||
          process.cwd(),
      },
    };

    if (typeof baseTransformer.getCacheKey === 'function') {
      return baseTransformer.getCacheKey(sourceText, sourcePath, normalizedTransformOptions);
    }

    // Fallback hashing (should not be used normally)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(String(sourceText));
    hash.update('\0');
    hash.update(String(sourcePath));
    hash.update('\0');
    hash.update(String(normalizedConfigString));
    hash.update('\0');
    if (normalizedTransformOptions && normalizedTransformOptions.instrument) {
      hash.update('instrument');
    }
    return hash.digest('hex');
  },
};
