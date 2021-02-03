/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const replacePattern = require('../replace_pattern');

module.exports = (parts) => {
  const result = {};
  Object.keys(parts).forEach((part) => {
    const key = replacePattern(part, { exact: true });
    const options = parts[part].options;
    if (options && options.length) {
      result[key] = options.sort();
    } else {
      result[key] = null;
    }
  });
  return result;
};
