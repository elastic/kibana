/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFunctionName } from './get_function_name';

describe('getFunctionName', () => {
  it('should return the function name if the function is defined as a variable assignment', () => {
    const mockNode = {
      parent: {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: 'myFunction',
        },
      },
    };

    expect(getFunctionName(mockNode as any)).toEqual(mockNode.parent.id.name);
  });

  it('should return the function name if the function is defined as a function declaration', () => {
    const mockNode = {
      parent: {
        type: 'FunctionDeclaration',
        id: {
          type: 'Identifier',
          name: 'myFunction',
        },
      },
    };

    expect(getFunctionName(mockNode as any)).toEqual('myFunction');
  });

  it('should return an empty string if the function name is not found', () => {
    const mockNode = {
      parent: {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: '',
        },
      },
    };

    expect(getFunctionName(mockNode as any)).toEqual('');
  });

  it('should return an empty string if the function is not a variable assignment or function declaration', () => {
    const mockNode = {
      parent: {
        type: 'SomeOtherType',
      },
    };

    expect(getFunctionName(mockNode as any)).toEqual('');
  });
});
