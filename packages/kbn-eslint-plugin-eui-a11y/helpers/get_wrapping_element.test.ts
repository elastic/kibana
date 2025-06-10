/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWrappingElement } from './get_wrapping_element';

describe('getWrappingElement', () => {
  it('should return the wrapping element if it exists', () => {
    const mockNode = {
      parent: {
        parent: {
          type: 'JSXElement',
          openingElement: {
            name: {
              type: 'JSXIdentifier',
              name: 'EuiFormRow',
            },
          },
        },
      },
    };

    expect(getWrappingElement(mockNode as any)).toEqual({
      elementName: 'EuiFormRow',
      node: mockNode.parent.parent.openingElement,
    });

    const mockNodeAlt = {
      parent: {
        parent: {
          type: 'JSXElement',
          openingElement: {
            name: {
              type: 'JSXIdentifier',
              name: 'div',
            },
          },
        },
      },
    };

    expect(getWrappingElement(mockNodeAlt as any)).toEqual({
      elementName: 'div',
      node: mockNodeAlt.parent.parent.openingElement,
    });
  });

  it('should return undefined if there is no wrapping element', () => {
    const mockNode = {
      parent: {},
    };

    const result = getWrappingElement(mockNode as any);
    expect(result).toBeUndefined();
  });
});
