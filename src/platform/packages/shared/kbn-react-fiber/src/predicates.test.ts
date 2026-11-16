/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isComponentFiber, isSourceComponent } from './predicates';

describe('isComponentFiber', () => {
  it('should accept function components and the `forwardRef` and `memo` objects wrapping them', () => {
    expect(isComponentFiber({ type: () => null })).toBe(true);
    expect(isComponentFiber({ type: { render: () => null } })).toBe(true);
    expect(isComponentFiber({ type: { type: { render: () => null } } })).toBe(true);
  });

  it('should reject host elements, context providers and fibers without a type', () => {
    expect(isComponentFiber({ type: 'div' })).toBe(false);
    expect(isComponentFiber({ type: {} })).toBe(false);
    expect(isComponentFiber({ type: null })).toBe(false);
  });
});

describe('isSourceComponent', () => {
  it('should reject host elements, EUI components, ignored wrappers and nameless fibers', () => {
    expect(isSourceComponent({ type: 'svg' })).toBe(false);
    expect(isSourceComponent({ type: { displayName: 'EuiButton' } })).toBe(false);
    expect(isSourceComponent({ type: { name: 'EmotionCssPropInternal' } })).toBe(false);
    expect(isSourceComponent({ type: { name: 'ConnectFunction' } })).toBe(false);
    expect(isSourceComponent({ type: { name: 'Route' } })).toBe(false);
    expect(isSourceComponent({ type: null })).toBe(false);
  });

  it('should accept application components, including the ones named after a route', () => {
    expect(isSourceComponent({ type: { name: 'SaveButton' } })).toBe(true);
    expect(isSourceComponent({ type: { name: 'DiscoverMainRoute' } })).toBe(true);
  });
});
