/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGraphDirection } from './get_graph_direction';

const wide = { width: 600, height: 150 };
const tall = { width: 300, height: 500 };

describe('getGraphDirection', () => {
  it('follows the panel shape when the layout is auto or not set', () => {
    expect(getGraphDirection('auto', wide)).toBe('LR');
    expect(getGraphDirection(undefined, tall)).toBe('TB');
  });

  it('uses the chosen direction whatever the panel shape', () => {
    expect(getGraphDirection('horizontal', tall)).toBe('LR');
    expect(getGraphDirection('vertical', wide)).toBe('TB');
  });
});
