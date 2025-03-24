/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Tests for the flattenFiltersExpression and reconstructExpression functions

import { flattenFiltersExpression, reconstructFiltersExpression } from './filters_expression';

describe('flattenFiltersExpression', () => {
  it('should flatten one-element boolean expressions', () => {
    expect(
      flattenFiltersExpression({
        operator: 'and',
        operands: [{ value: 'filter-1' }],
      })
    ).toEqual([{ filter: { value: 'filter-1' } }]);
  });

  it('should flatten simple boolean expressions', () => {
    expect(
      flattenFiltersExpression({
        operator: 'and',
        operands: [{ value: 'filter-1' }, { value: 'filter-2' }],
      })
    ).toEqual([
      { filter: { value: 'filter-1' } },
      { operator: 'and' },
      { filter: { value: 'filter-2' } },
    ]);
  });

  it('should flatten deep boolean expressions (in pre-order)', () => {
    expect(
      flattenFiltersExpression({
        operator: 'or',
        operands: [
          {
            operator: 'and',
            operands: [{ value: 'filter-1' }, { value: 'filter-2' }],
          },
          { value: 'filter-3' },
        ],
      })
    ).toEqual([
      { filter: { value: 'filter-1' } },
      { operator: 'and' },
      { filter: { value: 'filter-2' } },
      { operator: 'or' },
      { filter: { value: 'filter-3' } },
    ]);

    expect(
      flattenFiltersExpression({
        operator: 'or',
        operands: [
          { value: 'filter-1' },
          {
            operator: 'and',
            operands: [{ value: 'filter-2' }, { value: 'filter-3' }],
          },
        ],
      })
    ).toEqual([
      { filter: { value: 'filter-1' } },
      { operator: 'or' },
      { filter: { value: 'filter-2' } },
      { operator: 'and' },
      { filter: { value: 'filter-3' } },
    ]);

    expect(
      flattenFiltersExpression({
        operator: 'or',
        operands: [
          { value: 'filter-1' },
          {
            operator: 'and',
            operands: [{ value: 'filter-2' }, { value: 'filter-3' }],
          },
        ],
      })
    ).toEqual([
      { filter: { value: 'filter-1' } },
      { operator: 'or' },
      { filter: { value: 'filter-2' } },
      { operator: 'and' },
      { filter: { value: 'filter-3' } },
    ]);

    expect(
      flattenFiltersExpression({
        operator: 'or',
        operands: [
          {
            operator: 'or',
            operands: [
              { value: 'filter-1' },
              { value: 'filter-2' },
              {
                operator: 'and',
                operands: [{ value: 'filter-3' }, { value: 'filter-4' }],
              },
            ],
          },
          { value: 'filter-5' },
        ],
      })
    ).toEqual([
      { filter: { value: 'filter-1' } },
      { operator: 'or' },
      { filter: { value: 'filter-2' } },
      { operator: 'or' },
      { filter: { value: 'filter-3' } },
      { operator: 'and' },
      { filter: { value: 'filter-4' } },
      { operator: 'or' },
      { filter: { value: 'filter-5' } },
    ]);
  });
});

describe('reconstructFiltersExpression', () => {
  it('should reconstruct one-element boolean expressions, using an and operation by default', () => {
    expect(reconstructFiltersExpression([{ filter: { value: 'filter-1' } }])).toEqual({
      operator: 'and',
      operands: [{ value: 'filter-1' }],
    });
  });

  it('should reconstruct simple boolean expressions', () => {
    expect(
      reconstructFiltersExpression([
        { filter: { value: 'filter-1' } },
        { operator: 'and' },
        { filter: { value: 'filter-2' } },
      ])
    ).toEqual({
      operator: 'and',
      operands: [{ value: 'filter-1' }, { value: 'filter-2' }],
    });
  });

  it('should reconstruct deep boolean expressions respecting the operators precedence', () => {
    expect(
      reconstructFiltersExpression([
        { filter: { value: 'filter-1' } },
        { operator: 'and' },
        { filter: { value: 'filter-2' } },
        { operator: 'or' },
        { filter: { value: 'filter-3' } },
      ])
    ).toEqual({
      operator: 'or',
      operands: [
        {
          operator: 'and',
          operands: [{ value: 'filter-1' }, { value: 'filter-2' }],
        },
        { value: 'filter-3' },
      ],
    });

    expect(
      reconstructFiltersExpression([
        { filter: { value: 'filter-1' } },
        { operator: 'or' },
        { filter: { value: 'filter-2' } },
        { operator: 'and' },
        { filter: { value: 'filter-3' } },
      ])
    ).toEqual({
      operator: 'or',
      operands: [
        { value: 'filter-1' },
        {
          operator: 'and',
          operands: [{ value: 'filter-2' }, { value: 'filter-3' }],
        },
      ],
    });

    expect(
      reconstructFiltersExpression([
        { filter: { value: 'filter-1' } },
        { operator: 'or' },
        { filter: { value: 'filter-2' } },
        { operator: 'or' },
        { filter: { value: 'filter-3' } },
        { operator: 'and' },
        { filter: { value: 'filter-4' } },
        { operator: 'or' },
        { filter: { value: 'filter-5' } },
      ])
    ).toEqual({
      operator: 'or',
      operands: [
        {
          operator: 'or',
          operands: [
            { value: 'filter-1' },
            { value: 'filter-2' },
            {
              operator: 'and',
              operands: [{ value: 'filter-3' }, { value: 'filter-4' }],
            },
          ],
        },
        { value: 'filter-5' },
      ],
    });
  });
});
