/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionVariable } from '@kbn/alerting-types';
import { validateParamsForWarnings } from './validate_params_for_warnings';

describe('validateParamsForWarnings', () => {
  const actionVariables: ActionVariable[] = [
    {
      name: 'context.url',
      description: 'Test url',
      usesPublicBaseUrl: true,
    },
    {
      name: 'context.name',
      description: 'Test name',
    },
  ];

  test('returns warnings when publicUrl is not set and there are publicUrl variables used', () => {
    const warning =
      'server.publicBaseUrl is not set. Generated URLs will be either relative or empty.';
    expect(
      validateParamsForWarnings({
        value: 'Test for {{context.url}}',
        actionVariables,
      })
    ).toEqual(warning);

    expect(
      validateParamsForWarnings({
        value: 'link: {{ context.url }}',
        actionVariables,
      })
    ).toEqual(warning);

    expect(
      validateParamsForWarnings({
        value: '{{=<% %>=}}link: <%context.url%>',
        actionVariables,
      })
    ).toEqual(warning);
  });

  test('does not return warnings when publicUrl is not set and there are publicUrl variables not used', () => {
    expect(
      validateParamsForWarnings({
        value: 'Test for {{context.name}}',
        actionVariables,
      })
    ).toBeFalsy();
  });

  test('does not return warnings when publicUrl is set and there are publicUrl variables used', () => {
    expect(
      validateParamsForWarnings({
        value: 'Test for {{context.url}}',
        publicBaseUrl: 'http://test',
        actionVariables,
      })
    ).toBeFalsy();
  });

  test('does not returns warnings when publicUrl is not set and the value is not a string', () => {
    expect(
      validateParamsForWarnings({
        value: 10,
        actionVariables,
      })
    ).toBeFalsy();
  });

  test('does not throw an error when passing in invalid mustache', () => {
    expect(() =>
      validateParamsForWarnings({
        value: '{{',
        actionVariables,
      })
    ).not.toThrowError();
  });
});
