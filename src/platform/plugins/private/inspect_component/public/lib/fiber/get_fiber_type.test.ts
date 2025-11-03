/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberType } from './get_fiber_type';
import type { ReactFiberNode } from './types';

describe('getFiberType', () => {
  it('should return the type string when type is a string', () => {
    const fiber = {
      type: 'div',
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('div');
  });

  it('should return the type.name when type.name is a string', () => {
    const fiber = {
      type: {
        name: 'FunctionalComponent',
      },
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('FunctionalComponent');
  });

  it('should return the type.displayName when type.displayName is a string', () => {
    const fiber = {
      type: {
        displayName: 'StyledComponent',
      },
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('StyledComponent');
  });

  it('should return the elementType when elementType is a string', () => {
    const fiber = {
      elementType: 'span',
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('span');
  });

  it('should prefer type over elementType when both are strings', () => {
    const fiber = {
      type: 'div',
      elementType: 'span',
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('div');
  });

  it('should prefer type.name over type.displayName when both exist', () => {
    const fiber = {
      type: {
        name: 'ComponentName',
        displayName: 'DisplayComponentName',
      },
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBe('ComponentName');
  });

  it('should return null when no identifiable type is found', () => {
    const fiber = {
      type: {},
    } as ReactFiberNode;

    expect(getFiberType(fiber)).toBeNull();
  });
});
