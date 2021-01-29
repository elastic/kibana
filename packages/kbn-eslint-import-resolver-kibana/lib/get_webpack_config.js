/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { resolve } = require('path');

exports.getWebpackConfig = function (kibanaPath) {
  return {
    context: kibanaPath,
    resolve: {
      extensions: ['.js', '.json', '.ts', '.tsx'],
      mainFields: ['browser', 'main'],
      modules: ['node_modules', resolve(kibanaPath, 'node_modules')],
      alias: {
        // Dev defaults for test bundle https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/core_plugins/tests_bundle/index.js#L73-L78
        fixtures: resolve(kibanaPath, 'src/fixtures'),
      },
      unsafeCache: true,
    },
  };
};
