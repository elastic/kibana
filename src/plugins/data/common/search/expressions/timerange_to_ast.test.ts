/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerangeToAst } from './timerange_to_ast';

describe('timerangeToAst', () => {
  it('returns an object with the correct structure', () => {
    const actual = timerangeToAst({ from: 'now', to: 'now-7d', mode: 'absolute' });

    expect(actual).toHaveProperty('chain.0.function', 'timerange');
    expect(actual).toHaveProperty('chain.0.arguments', {
      from: ['now'],
      mode: ['absolute'],
      to: ['now-7d'],
    });
  });
});
