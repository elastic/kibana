/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const Fs = require('fs');

/**
 * @param {string} path
 */
function safeIsFile(path) {
  try {
    return Fs.statSync(path).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * @param {string} path
 */
function safeReadDir(path) {
  try {
    return Fs.readdirSync(path, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return [];
    }

    throw error;
  }
}

/**
 * Search for `name` files in directories within `packageDir`
 *
 * @param {string} packageDir
 * @param {string} name
 * @returns {string[]}
 */
function findFiles(packageDir, name) {
  return (
    // get the directories within the "package dir"
    safeReadDir(packageDir)
      // if this directory has a file with the name, it's a match
      .flatMap((e) => {
        if (!e.isDirectory()) {
          return [];
        }

        const path = Path.resolve(packageDir, e.name, name);
        return safeIsFile(path) ? path : [];
      })
  );
}

/**
 * Expand simple `*` wildcards in patterns, which are otherwise expected to be
 * paths relative to `cwd`.
 *
 * @param {string} cwd
 * @param {string[]} patterns
 */
function expandWildcards(cwd, patterns) {
  /** @type {Set<string>} */
  const results = new Set();

  /** @type {Set<string>} */
  const queue = new Set(patterns.map((p) => Path.resolve(cwd, p)));

  for (const pattern of queue) {
    let length = 3;
    let index = pattern.indexOf('/*/');
    if (index === -1 && pattern.endsWith('/*')) {
      length = 2;
      index = pattern.length - length;
    }

    if (index === -1) {
      results.add(pattern);
      continue;
    }

    const left = pattern.slice(0, index + 1);
    const right = pattern.slice(index + length);
    for (const ent of safeReadDir(left)) {
      if (!ent.isDirectory()) {
        continue;
      }

      const path = Path.resolve(left, ent.name);

      if (right) {
        queue.add(Path.resolve(path, right));
      } else {
        results.add(path);
      }
    }
  }

  return [...results];
}

module.exports = { findFiles, expandWildcards };
