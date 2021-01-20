/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { makeFakeXAspect } from './_fake_x_aspect';

describe('makeFakeXAspect', function () {
  it('creates an object that looks like an aspect', function () {
    const aspect = makeFakeXAspect();

    expect(aspect).toHaveProperty('accessor', -1);
    expect(aspect).toHaveProperty('title', 'All docs');
    expect(aspect).toHaveProperty('format');
    expect(aspect).toHaveProperty('params');

    expect(aspect.params).toHaveProperty('defaultValue', '_all');
  });
});
