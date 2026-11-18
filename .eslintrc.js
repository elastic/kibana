/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/swc-register').install();

module.exports = {
  root: true,

  extends: ['@kbn/eslint-config'],

  overrides: [
    /**
     * Code inside .buildkite runs separately from everything else in CI, before bootstrap, with Node. It needs a few tweaks because of this.
     */
    {
      files: '.buildkite/**/*.{cjs,js,mjs,ts}',
      parserOptions: {
        ecmaVersion: 2022,
      },
    },
  ],
};

/**
 * Prettier disables all conflicting rules, listing as last override so it takes precedence
 * people kept ignoring that this was last so it's now defined outside of the overrides list
 */
/** eslint-disable-next-line */
module.exports.overrides.push({ files: ['**/*'], rules: require('eslint-config-prettier').rules });
/** PLEASE DON'T PUT THINGS AFTER THIS */
