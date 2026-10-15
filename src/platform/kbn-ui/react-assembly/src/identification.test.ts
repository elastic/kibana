/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import { isReactLikeElement, getPartType, getPresetId } from './identification';
import { createDeclarativeComponent } from './factory';

describe('isReactLikeElement', () => {
  it('should return `true` for objects with a `type` property.', () => {
    expect(isReactLikeElement({ type: 'div' })).toBe(true);
  });

  it('should return `true` for React elements.', () => {
    expect(isReactLikeElement(createElement('div'))).toBe(true);
  });

  it('should return `false` for `null`.', () => {
    expect(isReactLikeElement(null)).toBe(false);
  });

  it('should return `false` for primitives.', () => {
    expect(isReactLikeElement('hello')).toBe(false);
    expect(isReactLikeElement(42)).toBe(false);
    expect(isReactLikeElement(true)).toBe(false);
    expect(isReactLikeElement(undefined)).toBe(false);
  });

  it('should return `false` for objects without a `type` property.', () => {
    expect(isReactLikeElement({ props: {} })).toBe(false);
  });
});

describe('getPartType', () => {
  const assembly = 'TestAssembly';

  it('should return the part name for a matching component.', () => {
    const Component = createDeclarativeComponent({
      assembly,
      part: 'column',
      preset: 'name',
    });
    const element = createElement(Component);
    expect(getPartType(element, assembly)).toBe('column');
  });

  it('should return `undefined` for a component from a different assembly.', () => {
    const Component = createDeclarativeComponent({
      assembly: 'Other',
      part: 'column',
    });
    const element = createElement(Component);
    expect(getPartType(element, assembly)).toBeUndefined();
  });

  it('should return `undefined` for non-element values.', () => {
    expect(getPartType(null, assembly)).toBeUndefined();
    expect(getPartType('text', assembly)).toBeUndefined();
    expect(getPartType(42, assembly)).toBeUndefined();
  });

  it('should return `undefined` for plain HTML elements.', () => {
    const element = createElement('div');
    expect(getPartType(element, assembly)).toBeUndefined();
  });
});

describe('getPresetId', () => {
  const assembly = 'TestAssembly';

  it('should return the preset for a component with a static preset.', () => {
    const Component = createDeclarativeComponent({
      assembly,
      part: 'column',
      preset: 'name',
    });
    const element = createElement(Component);
    expect(getPresetId(element, assembly)).toBe('name');
  });

  it('should return `undefined` for a component without a preset.', () => {
    const Component = createDeclarativeComponent({ assembly, part: 'column' });
    const element = createElement(Component);
    expect(getPresetId(element, assembly)).toBeUndefined();
  });

  it('should return `undefined` for a different assembly.', () => {
    const Component = createDeclarativeComponent({
      assembly: 'Other',
      part: 'column',
      preset: 'name',
    });
    const element = createElement(Component);
    expect(getPresetId(element, assembly)).toBeUndefined();
  });

  it('should return `undefined` for non-element values.', () => {
    expect(getPresetId(null, assembly)).toBeUndefined();
    expect(getPresetId('text', assembly)).toBeUndefined();
  });
});
