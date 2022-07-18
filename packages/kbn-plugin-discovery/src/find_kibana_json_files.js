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
 * Given an iterable of paths with optoinal "*" segments, expand the path to the
 * list of actual absolute paths, removing all "*" segments, and then return the
 * set of paths which end up pointing to actual files.
 *
 * @param {string} dir
 * @param {number} depth
 * @returns {string[]}
 */
function findKibanaJsonFiles(dir, depth) {
  // if depth = 0 then we just need to determine if there is a kibana.json file in this directory
  // and return either that path or an empty array
  if (depth === 0) {
    const path = Path.resolve(dir, 'kibana.json');
    return Fs.existsSync(path) ? [path] : [];
  }

  // if depth > 0 read the files in this directory, if we find a kibana.json file then we can stop
  // otherwise we will iterate through the child directories and try to find kibana.json files there.
  const files = safeReadDir(dir);

  /** @type {string[]} */
  const childDirs = [];
  for (const ent of files) {
    if (ent.isFile()) {
      if (ent.name === 'kibana.json') {
        return [Path.resolve(dir, ent.name)];
      }
    } else if (ent.isDirectory()) {
      childDirs.push(Path.resolve(dir, ent.name));
    }
  }

  return childDirs.flatMap((dir) => findKibanaJsonFiles(dir, depth - 1));
}

module.exports = { findKibanaJsonFiles };
