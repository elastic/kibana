/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasDebugSource, isSourceComponent } from './predicates';

describe('isSourceComponent', () => {
  it('should reject host elements, EUI components, ignored wrappers and nameless fibers', () => {
    expect(isSourceComponent({ type: 'svg' })).toBe(false);
    expect(isSourceComponent({ type: { displayName: 'EuiButton' } })).toBe(false);
    expect(isSourceComponent({ type: { name: 'EmotionCssPropInternal' } })).toBe(false);
    expect(isSourceComponent({ type: { name: 'ConnectFunction' } })).toBe(false);
    expect(isSourceComponent({ type: null })).toBe(false);
  });

  it('should accept application components', () => {
    expect(isSourceComponent({ type: { name: 'SaveButton' } })).toBe(true);
  });
});

describe('hasDebugSource', () => {
  it('should only accept fibers with source information', () => {
    expect(hasDebugSource({ type: 'div' })).toBe(false);
    expect(
      hasDebugSource({
        type: 'div',
        _debugSource: { fileName: 'a.tsx', lineNumber: 1, columnNumber: 1 },
      })
    ).toBe(true);
  });
});
