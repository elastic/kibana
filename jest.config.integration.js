/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '.',
  roots: [
    '<rootDir>/src',
    '<rootDir>/packages',
    ...Fs.readdirSync(Path.resolve(__dirname, 'x-pack')).flatMap((name) => {
      // create roots for all x-pack/* dirs except for test
      if (name !== 'test' && Fs.statSync(Path.resolve(__dirname, 'x-pack', name)).isDirectory()) {
        return [`<rootDir>/x-pack/${name}`];
      }

      return [];
    }),
  ],
};
