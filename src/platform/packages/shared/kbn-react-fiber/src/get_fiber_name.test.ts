/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberName } from './get_fiber_name';

describe('getFiberName', () => {
  it('should return the tag name of host fibers', () => {
    expect(getFiberName({ type: 'div' })).toBe('div');
  });

  it('should prefer the function name over the display name', () => {
    expect(getFiberName({ type: { name: 'MyComponent', displayName: 'Styled' } })).toBe(
      'MyComponent'
    );
    expect(getFiberName({ type: { displayName: 'EuiButton' } })).toBe('EuiButton');
  });

  it('should unwrap memo and forwardRef types', () => {
    expect(getFiberName({ type: { render: { name: 'WithRef' } } })).toBe('WithRef');
    expect(getFiberName({ type: { type: { render: { displayName: 'Memoized' } } } })).toBe(
      'Memoized'
    );
  });

  it('should fall back to the element type and then to null', () => {
    expect(getFiberName({ type: null, elementType: 'span' })).toBe('span');
    expect(getFiberName({ type: {} })).toBeNull();
  });
});
