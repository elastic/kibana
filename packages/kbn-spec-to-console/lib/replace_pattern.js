/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const map = require('./static/map_interpolation.json');

module.exports = (pattern, { brackets, exact } = {}) => {
  let newPattern = pattern;
  Object.keys(map).forEach((key) => {
    const replaceFrom = brackets ? `{${key}}` : key;
    const replaceTo = brackets ? `{${map[key]}}` : map[key];
    if (exact) {
      const exactMatch = replaceFrom === newPattern;
      newPattern = exactMatch ? replaceTo : newPattern;
    } else {
      newPattern = newPattern.replace(replaceFrom, replaceTo);
    }
  });

  return newPattern.replace(/^\//, '');
};
