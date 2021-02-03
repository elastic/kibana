/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var isRoot = require('./is_root');

describe('isRoot', function () {
  test('0 is root', function () {
    expect(isRoot(0)).toBeTruthy();
  });

  test('not 0 is not root', function () {
    expect(isRoot(5)).toBeFalsy();
  });
});
