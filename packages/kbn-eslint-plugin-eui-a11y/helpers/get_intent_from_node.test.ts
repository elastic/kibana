/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIntentFromNode } from './get_intent_from_node';

describe('getIntentFromNode', () => {
  it('should return the intent if it exists', () => {
    const mockNode = {
      parent: {
        type: 'JSXElement',
        id: {
          type: 'Identifier',
          name: 'myIntent',
        },
        children: [
          {
            type: 'JSXText',
            value: 'hello',
          },
          {
            type: 'JSXText',
            value: 'world',
          },
        ],
      },
    };

    expect(getIntentFromNode(mockNode as any)).toEqual('hello world');
  });

  it('should return an empty string if there is parent element', () => {
    const mockNode = {
      parent: {},
    };

    expect(getIntentFromNode(mockNode as any)).toEqual('');
  });

  it('should return an empty string if there are no children to the parent element', () => {
    const mockNode = {
      parent: {
        type: 'JSXElement',
        id: {
          type: 'Identifier',
          name: 'myIntent',
        },
        children: [],
      },
    };

    expect(getIntentFromNode(mockNode as any)).toEqual('');

    const mockNodeAlt = {
      parent: {
        type: 'JSXElement',
        id: {
          type: 'Identifier',
          name: 'myIntent',
        },
      },
    };

    expect(getIntentFromNode(mockNodeAlt as any)).toEqual('');
  });
});
