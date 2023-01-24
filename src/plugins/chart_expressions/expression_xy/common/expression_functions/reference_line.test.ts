/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { ReferenceLineArgs, ReferenceLineConfigResult } from '../types';
import { referenceLineFunction } from './reference_line';

describe('referenceLine', () => {
  test('produces the correct arguments for minimum arguments', async () => {
    const args: ReferenceLineArgs = {
      value: 100,
      fill: 'above',
      position: 'bottom',
    };

    const result = referenceLineFunction.fn(null, args, createMockExecutionContext());

    const expectedResult: ReferenceLineConfigResult = {
      type: 'referenceLine',
      layerType: 'referenceLine',
      lineLength: 0,
      decorations: [
        {
          type: 'extendedReferenceLineDecorationConfig',
          ...args,
          textVisibility: false,
        },
      ],
    };
    expect(result).toEqual(expectedResult);
  });

  test('produces the correct arguments for maximum arguments', async () => {
    const args: ReferenceLineArgs = {
      name: 'some value',
      value: 100,
      icon: 'alert',
      iconPosition: 'below',
      position: 'bottom',
      lineStyle: 'solid',
      lineWidth: 10,
      color: '#fff',
      fill: 'below',
      textVisibility: true,
    };

    const result = referenceLineFunction.fn(null, args, createMockExecutionContext());

    const expectedResult: ReferenceLineConfigResult = {
      type: 'referenceLine',
      layerType: 'referenceLine',
      lineLength: 0,
      decorations: [
        {
          type: 'extendedReferenceLineDecorationConfig',
          ...args,
        },
      ],
    };
    expect(result).toEqual(expectedResult);
  });

  test('adds text visibility if name is provided ', async () => {
    const args: ReferenceLineArgs = {
      name: 'some name',
      value: 100,
      fill: 'none',
      position: 'bottom',
    };

    const result = referenceLineFunction.fn(null, args, createMockExecutionContext());

    const expectedResult: ReferenceLineConfigResult = {
      type: 'referenceLine',
      layerType: 'referenceLine',
      lineLength: 0,
      decorations: [
        {
          type: 'extendedReferenceLineDecorationConfig',
          ...args,
          textVisibility: true,
        },
      ],
    };
    expect(result).toEqual(expectedResult);
  });

  test('hides text if textVisibility is true and no text is provided', async () => {
    const args: ReferenceLineArgs = {
      value: 100,
      textVisibility: true,
      fill: 'none',
      position: 'bottom',
    };

    const result = referenceLineFunction.fn(null, args, createMockExecutionContext());

    const expectedResult: ReferenceLineConfigResult = {
      type: 'referenceLine',
      layerType: 'referenceLine',
      lineLength: 0,
      decorations: [
        {
          type: 'extendedReferenceLineDecorationConfig',
          ...args,
          textVisibility: false,
        },
      ],
    };
    expect(result).toEqual(expectedResult);
  });

  test('applies text visibility if name is provided', async () => {
    const checktextVisibility = (textVisibility: boolean = false) => {
      const args: ReferenceLineArgs = {
        value: 100,
        name: 'some text',
        textVisibility,
        fill: 'none',
        position: 'bottom',
      };

      const result = referenceLineFunction.fn(null, args, createMockExecutionContext());

      const expectedResult: ReferenceLineConfigResult = {
        type: 'referenceLine',
        layerType: 'referenceLine',
        lineLength: 0,
        decorations: [
          {
            type: 'extendedReferenceLineDecorationConfig',
            ...args,
            textVisibility,
          },
        ],
      };
      expect(result).toEqual(expectedResult);
    };

    checktextVisibility();
    checktextVisibility(true);
  });
});
