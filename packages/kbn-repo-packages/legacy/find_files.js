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
 * Search for files named `name` in `dir`, up to `depth` levels deep. If a directory has a
 * matching file its children are not iterated, otherwise if depth > 0 then all child
 * directories are checked recursively with depth-1
 *
 * @param {string} dir
 * @param {number} depth
 * @param {string} name
 * @returns {string[]}
 */
function findFiles(dir, depth, name) {
  // if depth = 0 then we just need to determine if there is a kibana.json file in this directory
  // and return either that path or an empty array
  if (depth === 0) {
    const path = Path.resolve(dir, name);
    return Fs.existsSync(path) ? [path] : [];
  }

  // if depth > 0 read the files in this directory, if we find a kibana.json file then we can stop
  // otherwise we will iterate through the child directories and try to find kibana.json files there.
  const files = safeReadDir(dir);

  /** @type {string[]} */
  const childDirs = [];
  for (const ent of files) {
    if (ent.isFile()) {
      if (ent.name === name) {
        return [Path.resolve(dir, ent.name)];
      }
    } else if (ent.isDirectory()) {
      childDirs.push(Path.resolve(dir, ent.name));
    }
  }

  return childDirs.flatMap((dir) => findFiles(dir, depth - 1, name));
}

module.exports = { findFiles };
