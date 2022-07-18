/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

/**
 * @param {string} path
 * @returns {string}
 */
export function maybeRealpath(path) {
  try {
    return Fs.realpathSync.native(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isDirectory(path) {
  try {
    const stat = Fs.statSync(path);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isFile(path) {
  try {
    const stat = Fs.statSync(path);
    return stat.isFile();
  } catch (error) {
    return false;
  }
}
