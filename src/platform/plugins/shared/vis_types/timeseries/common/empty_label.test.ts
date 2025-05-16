/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getValueOrEmpty } from './empty_label';

describe('getValueOrEmpty', () => {
  test('returns the value if not empty or slash value given', () => {
    expect(getValueOrEmpty('/test/blog')).toEqual('/test/blog');
  });

  test('returns (empty) if value is slash', () => {
    expect(getValueOrEmpty('/')).toEqual('(empty)');
  });

  test('returns (empty) if value is empty', () => {
    expect(getValueOrEmpty('')).toEqual('(empty)');
  });

  test('returns (empty) if value is null', () => {
    expect(getValueOrEmpty(null)).toEqual('(empty)');
  });
});
