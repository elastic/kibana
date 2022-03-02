/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line
const webpackConfig = require('./target_node/webpack.config');

module.exports = {
  managerEntries: (entry = []) => {
    return [require.resolve('./target_node/lib/register'), ...entry];
  },
  webpackFinal: (config) => {
    return webpackConfig({ config });
  },
  config: (entry) => {
    return [...entry, require.resolve('./target_node/lib/decorators')];
  },
};
