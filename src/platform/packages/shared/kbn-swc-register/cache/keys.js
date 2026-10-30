/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');

/**
 * @param {string} prefix
 * @param {string} path
 * @param {string} source
 * @returns {string}
 */
const getHashCacheKey = (prefix, path, source) =>
  `${prefix}:${Crypto.createHash('sha256').update(path).update(source).digest('hex')}`;

/**
 * @param {bigint | number} value
 * @returns {string | undefined}
 */
const getStatValue = (value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  return Number.isFinite(value) ? String(value) : undefined;
};

/**
 * @param {string} prefix
 * @param {string} path
 * @returns {string | undefined}
 */
const getMetadataCacheKey = (prefix, path) => {
  let stat;
  try {
    stat = Fs.statSync(path, { bigint: true });
  } catch {
    return undefined;
  }

  const keyParts = [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].map(
    getStatValue
  );

  if (keyParts.some((part) => part === undefined)) {
    return undefined;
  }

  return `${prefix}:stat:${keyParts.join(':')}:${Path.resolve(path)}`;
};

module.exports = { getHashCacheKey, getMetadataCacheKey };
