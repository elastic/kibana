/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const plugins = [
  require.resolve('babel-plugin-add-module-exports'),

  // The class properties proposal was merged with the private fields proposal
  // into the "class fields" proposal. Babel doesn't support this combined
  // proposal yet, which includes private field, so this transform is
  // TECHNICALLY stage 2, but for all intents and purposes it's stage 3
  //
  // See https://github.com/babel/proposals/issues/12 for progress
  require.resolve('@babel/plugin-proposal-class-properties'),

  // Optional Chaining proposal is stage 4 (https://github.com/tc39/proposal-optional-chaining)
  // Need this since we are using TypeScript 3.7+
  require.resolve('@babel/plugin-proposal-optional-chaining'),

  // Nullish coalescing proposal is stage 4 (https://github.com/tc39/proposal-nullish-coalescing)
  // Need this since we are using TypeScript 3.7+
  require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),

  // Proposal is on stage 4, and included in ECMA-262 (https://github.com/tc39/proposal-export-ns-from)
  // Need this since we are using TypeScript 3.8+
  require.resolve('@babel/plugin-proposal-export-namespace-from'),

  // Proposal is on stage 4, and included in ECMA-262 (https://github.com/tc39/proposal-export-ns-from)
  // Need this since we are using TypeScript 3.9+
  require.resolve('@babel/plugin-proposal-private-methods'),
];

module.exports = {
  presets: [
    [require.resolve('@babel/preset-typescript'), { allowNamespaces: true }],
    require.resolve('@babel/preset-react'),
  ],
  plugins,
};
