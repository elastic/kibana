/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = (_, options = {}) => {
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          targets: {
            // only applies the necessary transformations based on the
            // current node.js processes version. For example: running
            // `nvm install 8 && node ./src/cli` will run kibana in node
            // version 8 and babel will stop transpiling async/await
            // because they are supported in the "current" version of node
            node: 'current',
          },

          // replaces `import "core-js/stable"` with a list of require statements
          // for just the polyfills that the target versions don't already supply
          // on their own
          useBuiltIns: 'entry',
          modules: 'cjs',
          // right now when using `corejs: 3` babel does not use the latest available
          // core-js version due to a bug: https://github.com/babel/babel/issues/10816
          // Because of that we should use for that value the same version we install
          // in the package.json in order to have the same polyfills between the environment
          // and the tests
          corejs: '3.21.1',
          bugfixes: true,

          ...(options['@babel/preset-env'] || {}),
        },
      ],
      require('./common_preset'),
    ],
  };
};
