/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var forceRoot = require('./force');

describe('forceRoot', function () {
  it('with flag', function () {
    expect(forceRoot(['--allow-root'])).toBeTruthy();
  });

  it('without flag', function () {
    expect(forceRoot(['--foo'])).toBeFalsy();
  });

  test('remove argument', function () {
    var args = ['--allow-root', 'foo'];
    forceRoot(args);
    expect(args.includes('--allow-root')).toBeFalsy();
  });
});
