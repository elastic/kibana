/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { operatorCategory, operatorIconType } from './operator_icon';

describe('operatorIconType', () => {
  it('gives TopN its own sort icon while keeping it in the aggregate category', () => {
    expect(operatorIconType('TopN')).toBe('sortable');
    expect(operatorCategory('TopN')).toBe('aggregate');
  });

  it('keeps the existing icons for other operators', () => {
    expect(operatorIconType('HashAggregation')).toBe('stats');
    expect(operatorIconType('ValuesSourceReader')).toBe('search');
    expect(operatorIconType('Eval')).toBe('compute');
    expect(operatorIconType('Limit')).toBe('filter');
    expect(operatorIconType('ExchangeSink')).toBe('merge');
    expect(operatorIconType('Output')).toBe('dot');
  });
});
