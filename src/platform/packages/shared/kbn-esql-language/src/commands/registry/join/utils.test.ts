/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/consistent-type-imports */
import { getStaticPosition, getPosition, markCommonFields } from './utils';
import { ISuggestionItem } from '../types';
import { ESQLAstJoinCommand } from '../../../types';

describe('getStaticPosition()', () => {
  test('returns correct position on complete modifier matches', () => {
    expect(getStaticPosition('L')).toBe('type');
    expect(getStaticPosition('LE')).toBe('type');
    expect(getStaticPosition('LEFT')).toBe('type');
    expect(getStaticPosition('LEFT ')).toBe('after_type');
    expect(getStaticPosition('LEFT  ')).toBe('after_type');
    expect(getStaticPosition('LEFT  J')).toBe('mnemonic');
    expect(getStaticPosition('LEFT  JO')).toBe('mnemonic');
    expect(getStaticPosition('LEFT  JOI')).toBe('mnemonic');
    expect(getStaticPosition('LEFT  JOIN')).toBe('mnemonic');
    expect(getStaticPosition('LEFT  JOIN ')).toBe('after_mnemonic');
    expect(getStaticPosition('LEFT  JOIN  ')).toBe('after_mnemonic');
    expect(getStaticPosition('LEFT  JOIN  i')).toBe('index');
    expect(getStaticPosition('LEFT  JOIN  i2')).toBe('index');
    expect(getStaticPosition('LEFT  JOIN  ind')).toBe('index');
    expect(getStaticPosition('LEFT  JOIN  index')).toBe('index');
    expect(getStaticPosition('LEFT  JOIN  index ')).toBe('after_index');
    expect(getStaticPosition('LEFT  JOIN  index  ')).toBe('after_index');
    expect(getStaticPosition('LEFT  JOIN  index  A')).toBe('as');
    expect(getStaticPosition('LEFT  JOIN  index  As')).toBe('as');
    expect(getStaticPosition('LEFT  JOIN  index  AS')).toBe('as');
    expect(getStaticPosition('LEFT  JOIN  index  AS ')).toBe('after_as');
    expect(getStaticPosition('LEFT  JOIN  index  AS  ')).toBe('after_as');
    expect(getStaticPosition('LEFT  JOIN  index  AS a')).toBe('alias');
    expect(getStaticPosition('LEFT  JOIN  index  AS al2')).toBe('alias');
    expect(getStaticPosition('LEFT  JOIN  index  AS alias')).toBe('alias');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias ')).toBe('after_alias');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  ')).toBe('after_alias');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  O')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  On')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  ON')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  ON ')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  ON  ')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index  AS  alias  ON  a')).toBe('on');
  });

  test('returns correct position, when no <alias> part specified', () => {
    expect(getStaticPosition('LEFT  JOIN  index O')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index ON')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index ON ')).toBe('on');
    expect(getStaticPosition('LEFT  JOIN  index ON  ')).toBe('on');
  });
});

describe('getPosition()', () => {
  test('returns on_expression position with incomplete expression metadata', () => {
    const command = {
      name: 'join',
      text: 'JOIN index ON field',
      location: { min: 0, max: 19 },
      type: 'option',
      args: [
        { name: 'index', type: 'source', text: 'index', location: { min: 5, max: 10 } },
        {
          name: 'on',
          type: 'option',
          text: 'ON field',
          location: { min: 11, max: 19 },
          args: [
            {
              type: 'column',
              name: 'field',
              text: 'field',
              location: { min: 14, max: 19 },
              incomplete: true,
            },
          ],
        },
      ],
    };

    const result = getPosition('JOIN index ON field', command as ESQLAstJoinCommand, 19);

    expect(result.pos).toBe('on_expression');
    expect(result.isExpressionComplete).toBe(false);
    expect(result.expression?.name).toBe('field');
  });

  test('returns on_expression position after comma for new expression', () => {
    const command = {
      name: 'join',
      text: 'JOIN index ON a == b, ',
      location: { min: 0, max: 22 },
      type: 'option',
      args: [
        { name: 'index', type: 'source', text: 'index', location: { min: 5, max: 10 } },
        {
          name: 'on',
          type: 'option',
          text: 'ON a == b, ',
          location: { min: 11, max: 22 },
          args: [
            {
              type: 'function',
              name: '==',
              text: 'a == b',
              location: { min: 14, max: 20 },
              args: [
                { type: 'column', name: 'a', text: 'a', location: { min: 14, max: 15 } },
                { type: 'column', name: 'b', text: 'b', location: { min: 19, max: 20 } },
              ],
            },
          ],
        },
      ],
    };

    const result = getPosition('JOIN index ON a == b, ', command as ESQLAstJoinCommand, 22);

    expect(result.pos).toBe('on_expression');
    expect(result.isExpressionComplete).toBe(false);
    expect(result.expression).toBeUndefined();
  });
});

describe('markCommonFields()', () => {
  test('returns shared fields between two lists', () => {
    const result = markCommonFields(
      [
        { label: 'id', text: '', kind: 'Field', detail: '' },
        { label: 'currency', text: '', kind: 'Field', detail: '' },
        { label: 'value', text: '', kind: 'Field', detail: '' },
        { label: 'timestamp', text: '', kind: 'Field', detail: '' },
      ],
      [
        { label: 'id', text: '', kind: 'Field', detail: '' },
        { label: 'currency', text: '', kind: 'Field', detail: '' },
        { label: 'name', text: '', kind: 'Field', detail: '' },
      ]
    );

    expect(result.commonFieldLabels.has('id')).toBe(true);
    expect(result.commonFieldLabels.has('currency')).toBe(true);
    expect(result.commonFieldLabels.size).toBe(2);

    const intersection = result.markedSourceSuggestions
      .filter((s) => result.commonFieldLabels.has(s.label))
      .map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      }));

    expect(intersection).toEqual([
      {
        label: 'id',
        text: '',
        kind: 'Field',
        detail: '(common field)',
      },
      {
        label: 'currency',
        text: '',
        kind: 'Field',
        detail: '(common field)',
      },
    ]);
  });

  test('returns empty list if there are no shared fields', () => {
    const result = markCommonFields(
      [
        { label: 'id1', text: '', kind: 'Field', detail: '' },
        { label: 'value', text: '', kind: 'Field', detail: '' },
        { label: 'timestamp', text: '', kind: 'Field', detail: '' },
      ],
      [
        { label: 'id2', text: '', kind: 'Field', detail: '' },
        { label: 'currency', text: '', kind: 'Field', detail: '' },
        { label: 'name', text: '', kind: 'Field', detail: '' },
      ]
    );

    expect(result.commonFieldLabels.size).toBe(0);
  });

  test('returns all fields, if all intersect', () => {
    const result = markCommonFields(
      [
        { label: 'id1', text: '', kind: 'Field', detail: '' },
        { label: 'value', text: '', kind: 'Field', detail: '' },
        { label: 'timestamp', text: '', kind: 'Field', detail: '' },
      ],
      [
        { label: 'id1', text: '', kind: 'Field', detail: '' },
        { label: 'value', text: '', kind: 'Field', detail: '' },
      ]
    );

    expect(result.commonFieldLabels.has('id1')).toBe(true);
    expect(result.commonFieldLabels.has('value')).toBe(true);
    expect(result.commonFieldLabels.size).toBe(2);

    const intersection = result.markedSourceSuggestions
      .filter((s) => result.commonFieldLabels.has(s.label))
      .map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      }));

    expect(intersection).toEqual([
      { label: 'id1', text: '', kind: 'Field', detail: '(common field)' },
      { label: 'value', text: '', kind: 'Field', detail: '(common field)' },
    ]);
  });

  test('creates a clone of suggestions', () => {
    const suggestion1 = {
      label: 'id1',
      text: '',
      kind: 'Field',
      detail: '',
    };
    const suggestion2 = {
      label: 'id1',
      text: '',
      kind: 'Field',
      detail: '',
    };
    const result = markCommonFields(
      [suggestion1] as ISuggestionItem[],
      [suggestion2] as ISuggestionItem[]
    );

    expect(result.commonFieldLabels.has('id1')).toBe(true);
    expect(result.markedSourceSuggestions[0]).not.toBe(suggestion1);
    expect(result.markedSourceSuggestions[0].label).toBe('id1');
  });
});

describe('markCommonFields() - union behavior', () => {
  test('combines two sets without duplicates', () => {
    const result = markCommonFields(
      [
        { label: 'id', text: '', kind: 'Field', detail: '' },
        { label: 'currency', text: '', kind: 'Field', detail: '' },
        { label: 'value', text: '', kind: 'Field', detail: '' },
        { label: 'timestamp', text: '', kind: 'Field', detail: '' },
      ],
      [
        { label: 'id', text: '', kind: 'Field', detail: '' },
        { label: 'currency', text: '', kind: 'Field', detail: '' },
        { label: 'name', text: '', kind: 'Field', detail: '' },
      ]
    );

    const union = [
      ...result.markedSourceSuggestions.map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      })),
      ...result.uniqueLookupSuggestions.map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      })),
    ];

    expect(union).toEqual([
      {
        label: 'id',
        text: '',
        kind: 'Field',
        detail: '(common field)',
      },
      {
        label: 'currency',
        text: '',
        kind: 'Field',
        detail: '(common field)',
      },
      {
        label: 'value',
        text: '',
        kind: 'Field',
        detail: '',
      },
      {
        label: 'timestamp',
        text: '',
        kind: 'Field',
        detail: '',
      },
      {
        label: 'name',
        text: '',
        kind: 'Field',
        detail: '',
      },
    ]);
  });

  test('combines two non-overlapping sets', () => {
    const result = markCommonFields(
      [{ label: 'id', text: '', kind: 'Field', detail: '' }],
      [{ label: 'currency', text: '', kind: 'Field', detail: '' }]
    );

    expect(result.commonFieldLabels.size).toBe(0);

    const union = [
      ...result.markedSourceSuggestions.map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      })),
      ...result.uniqueLookupSuggestions.map((s) => ({
        label: s.label,
        text: s.text,
        kind: s.kind,
        detail: s.detail,
      })),
    ];

    expect(union).toEqual([
      {
        label: 'id',
        text: '',
        kind: 'Field',
        detail: '',
      },
      {
        label: 'currency',
        text: '',
        kind: 'Field',
        detail: '',
      },
    ]);
  });
});
