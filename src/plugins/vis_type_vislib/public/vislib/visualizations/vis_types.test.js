/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

import { visTypes } from './vis_types';

describe('Vislib Vis Types Test Suite', function () {
  let visFunc;

  beforeEach(function () {
    visFunc = visTypes.point_series;
  });

  it('should be an object', function () {
    expect(_.isObject(visTypes)).toBe(true);
  });

  it('should return a function', function () {
    expect(typeof visFunc).toBe('function');
  });
});
