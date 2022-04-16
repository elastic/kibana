/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fn = require('./load_functions');

const expect = require('chai').expect;

describe('load_functions.js', () => {
  it('exports a function', () => {
    expect(fn).to.be.a('function');
  });

  it('returns an object with keys named for the javascript files in the directory', () => {
    const fnList = fn('series_functions');

    expect(fnList).to.be.an('object');
    expect(fnList.sum).to.be.a('object');
  });

  it('also includes index.js files in direct subdirectories, and names the keys for the directory', () => {
    const fnList = fn('series_functions');

    expect(fnList).to.be.an('object');
    expect(fnList.es).to.be.a('object');
  });
});
