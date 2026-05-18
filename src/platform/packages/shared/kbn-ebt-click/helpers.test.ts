/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEbtProps } from './helpers';

describe('getEbtProps', () => {
  it('maps all three fields when all are provided', () => {
    expect(getEbtProps({ action: 'viewSpan', element: 'waterfallRow', detail: 'span' })).toEqual({
      'data-ebt-action': 'viewSpan',
      'data-ebt-element': 'waterfallRow',
      'data-ebt-detail': 'span',
    });
  });

  it('omits data-ebt-detail when detail is not provided', () => {
    expect(getEbtProps({ action: 'viewSpan', element: 'waterfallRow' })).toEqual({
      'data-ebt-action': 'viewSpan',
      'data-ebt-element': 'waterfallRow',
    });
  });

  it('omits data-ebt-detail when detail is an empty string', () => {
    expect(getEbtProps({ action: 'viewSpan', element: 'waterfallRow', detail: '' })).toEqual({
      'data-ebt-action': 'viewSpan',
      'data-ebt-element': 'waterfallRow',
    });
  });
});
