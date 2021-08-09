/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Qs = require('querystring');
const { stringifyRequest } = require('loader-utils');

const VAL_LOADER = require.resolve('val-loader');
const MODULE_CREATOR = require.resolve('./public_path_module_creator');

module.exports = function (source) {
  const options = this.query;
  const valOpts = Qs.stringify({ key: options.key });
  const req = `${VAL_LOADER}?${valOpts}!${MODULE_CREATOR}`;
  return `import ${stringifyRequest(this, req)};${source}`;
};
