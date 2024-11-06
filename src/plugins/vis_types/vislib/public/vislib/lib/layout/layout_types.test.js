/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import { layoutTypes as layoutType } from './layout_types';

describe('Vislib Layout Types Test Suite', function () {
  let layoutFunc;

  beforeEach(() => {
    layoutFunc = layoutType.point_series;
  });

  it('should be an object', function () {
    expect(_.isObject(layoutType)).toBe(true);
  });

  it('should return a function', function () {
    expect(typeof layoutFunc).toBe('function');
  });
});
