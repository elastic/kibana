/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@typescript-eslint/parser';
import { getPropValues } from './get_prop_values';

describe('getPropValues', () => {
  it('should return the prop values from the node', () => {
    const code = parse(
      `<MyComponent prop1="bar" prop2={i18n.translate('bar', {})} prop3="baz" />`,
      {
        ecmaFeatures: {
          jsx: true,
        },
      }
    );

    const element = (code.body[0] as any).expression as any;

    expect(
      getPropValues({
        jsxOpeningElement: element.openingElement,
        propNames: ['prop1', 'prop2'],
        sourceCode: {
          getScope: () =>
            ({
              attributes: [],
            } as any),
        } as any,
      })
    ).toEqual({
      prop1: { type: 'Literal', value: 'bar', raw: '"bar"' },
      prop2: element.openingElement.attributes[1].value,
    });
  });

  it('should return an empty object if there are no props found', () => {
    const code = parse(`<MyComponent  />`, {
      ecmaFeatures: {
        jsx: true,
      },
    });

    expect(
      getPropValues({
        jsxOpeningElement: ((code.body[0] as any).expression as any).openingElement,
        propNames: ['prop1', 'prop2'],
        sourceCode: {
          getScope: () =>
            ({
              attributes: [],
            } as any),
        } as any,
      })
    ).toEqual({});
  });
});
