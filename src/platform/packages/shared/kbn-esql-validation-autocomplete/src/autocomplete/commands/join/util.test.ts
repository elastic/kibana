/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { joinIndices } from '../../../__tests__/helpers';
import {
  getPosition,
  joinIndicesToSuggestions,
  suggestionIntersection,
  suggestionUnion,
} from './util';
import { SuggestionRawDefinition } from '../../types';

describe('getPosition()', () => {
  test('returns correct position on complete modifier matches', () => {
    expect(getPosition('L', {} as any).pos).toBe('type');
    expect(getPosition('LE', {} as any).pos).toBe('type');
    expect(getPosition('LEFT', {} as any).pos).toBe('type');
    expect(getPosition('LEFT ', {} as any).pos).toBe('after_type');
    expect(getPosition('LEFT  ', {} as any).pos).toBe('after_type');
    expect(getPosition('LEFT  J', {} as any).pos).toBe('mnemonic');
    expect(getPosition('LEFT  JO', {} as any).pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOI', {} as any).pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOIN', {} as any).pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOIN ', {} as any).pos).toBe('after_mnemonic');
    expect(getPosition('LEFT  JOIN  ', {} as any).pos).toBe('after_mnemonic');
    expect(getPosition('LEFT  JOIN  i', {} as any).pos).toBe('index');
    expect(getPosition('LEFT  JOIN  i2', {} as any).pos).toBe('index');
    expect(getPosition('LEFT  JOIN  ind', {} as any).pos).toBe('index');
    expect(getPosition('LEFT  JOIN  index', {} as any).pos).toBe('index');
    expect(getPosition('LEFT  JOIN  index ', {} as any).pos).toBe('after_index');
    expect(getPosition('LEFT  JOIN  index  ', {} as any).pos).toBe('after_index');
    expect(getPosition('LEFT  JOIN  index  A', {} as any).pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  As', {} as any).pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  AS', {} as any).pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  AS ', {} as any).pos).toBe('after_as');
    expect(getPosition('LEFT  JOIN  index  AS  ', {} as any).pos).toBe('after_as');
    expect(getPosition('LEFT  JOIN  index  AS a', {} as any).pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS al2', {} as any).pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS alias', {} as any).pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias ', {} as any).pos).toBe('after_alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ', {} as any).pos).toBe('after_alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias  O', {} as any).pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  On', {} as any).pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON', {} as any).pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON ', {} as any).pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON  ', {} as any).pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON  a', {} as any).pos).toBe('condition');
  });

  test('returns correct position, when no <alias> part specified', () => {
    expect(getPosition('LEFT  JOIN  index O', {} as any).pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index ON', {} as any).pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index ON ', {} as any).pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index ON  ', {} as any).pos).toBe('after_on');
  });
});

describe('joinIndicesToSuggestions()', () => {
  test('converts join indices to suggestions', () => {
    const suggestions = joinIndicesToSuggestions(joinIndices);
    const labels = suggestions.map((s) => s.label);

    expect(labels).toEqual([
      'join_index',
      'join_index_with_alias',
      'join_index_alias_1',
      'join_index_alias_2',
    ]);
  });
});

describe('suggestionIntersection()', () => {
  test('returns shared fields between two lists', () => {
    const intersection = suggestionIntersection(
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

    expect(intersection).toEqual([
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

  test('returns empty list if there are no shared fields', () => {
    const intersection = suggestionIntersection(
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

    expect(intersection).toEqual([]);
  });

  test('returns all fields, if all intersect', () => {
    const intersection = suggestionIntersection(
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

    expect(intersection).toEqual([
      { label: 'id1', text: '', kind: 'Field', detail: '' },
      { label: 'value', text: '', kind: 'Field', detail: '' },
    ]);
  });

  test('creates a clone of suggestions', () => {
    const suggestion1: SuggestionRawDefinition = {
      label: 'id1',
      text: '',
      kind: 'Field',
      detail: '',
    };
    const suggestion2: SuggestionRawDefinition = {
      label: 'id1',
      text: '',
      kind: 'Field',
      detail: '',
    };
    const intersection = suggestionIntersection([suggestion1], [suggestion2]);

    expect(intersection).toEqual([suggestion1]);
    expect(intersection[0]).not.toBe(suggestion1);
    expect(intersection[0]).not.toBe(suggestion2);
  });
});

describe('suggestionUnion()', () => {
  test('combines two sets without duplicates', () => {
    const intersection = suggestionUnion(
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

    expect(intersection).toEqual([
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
    const intersection = suggestionUnion(
      [{ label: 'id', text: '', kind: 'Field', detail: '' }],
      [{ label: 'currency', text: '', kind: 'Field', detail: '' }]
    );

    expect(intersection).toEqual([
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
