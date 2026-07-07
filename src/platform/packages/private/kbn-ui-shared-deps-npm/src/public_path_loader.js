/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const VAL_LOADER = require.resolve('val-loader');
const MODULE_CREATOR = require.resolve('./public_path_module_creator');

/**
 * @this {import('webpack').LoaderContext<any>}
 * @param {string} source
 */
module.exports = function (source) {
  const options = this.query;
  const valOpts = new URLSearchParams({ key: options.key }).toString();
  const req = JSON.stringify(
    this.utils.contextify(
      this.context || this.rootContext,
      `${VAL_LOADER}?${valOpts}!${MODULE_CREATOR}`
    )
  );
  return `require(${req});${source}`;
};
