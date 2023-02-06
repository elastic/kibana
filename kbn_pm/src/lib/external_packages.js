/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
module.exports = {
  ['@kbn/repo-packages']() {
    require('@kbn/babel-register').install();
    return require('@kbn/repo-packages');
  },

  ['@kbn/ci-stats-reporter']() {
    require('@kbn/babel-register').install();
    return require('@kbn/ci-stats-reporter');
  },

  ['@kbn/yarn-lock-validator']() {
    require('@kbn/babel-register').install();
    return require('@kbn/yarn-lock-validator');
  },

  ['@kbn/sort-package-json']() {
    require('@kbn/babel-register').install();
    return require('@kbn/sort-package-json');
  },

  ['@kbn/get-repo-files']() {
    require('@kbn/babel-register').install();
    return require('@kbn/get-repo-files');
  },

  ['@kbn/repo-info']() {
    require('@kbn/babel-register').install();
    return require('@kbn/repo-info');
  },

  ['@kbn/ts-projects']() {
    require('@kbn/babel-register').install();
    return require('@kbn/ts-projects');
  },

  /**
   * @param {string} absPath
   * @returns {unknown}
   */
  reqAbs(absPath) {
    require('@kbn/babel-register').install();
    // eslint-disable-next-line import/no-dynamic-require
    return require(absPath);
  },
};
