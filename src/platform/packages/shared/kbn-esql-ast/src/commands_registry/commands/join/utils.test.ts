/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPosition, suggestionIntersection, suggestionUnion } from './utils';
import { ISuggestionItem } from '../../types';

describe('getPosition()', () => {
  test('returns correct position on complete modifier matches', () => {
    expect(getPosition('L').pos).toBe('type');
    expect(getPosition('LE').pos).toBe('type');
    expect(getPosition('LEFT').pos).toBe('type');
    expect(getPosition('LEFT ').pos).toBe('after_type');
    expect(getPosition('LEFT  ').pos).toBe('after_type');
    expect(getPosition('LEFT  J').pos).toBe('mnemonic');
    expect(getPosition('LEFT  JO').pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOI').pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOIN').pos).toBe('mnemonic');
    expect(getPosition('LEFT  JOIN ').pos).toBe('after_mnemonic');
    expect(getPosition('LEFT  JOIN  ').pos).toBe('after_mnemonic');
    expect(getPosition('LEFT  JOIN  i').pos).toBe('index');
    expect(getPosition('LEFT  JOIN  i2').pos).toBe('index');
    expect(getPosition('LEFT  JOIN  ind').pos).toBe('index');
    expect(getPosition('LEFT  JOIN  index').pos).toBe('index');
    expect(getPosition('LEFT  JOIN  index ').pos).toBe('after_index');
    expect(getPosition('LEFT  JOIN  index  ').pos).toBe('after_index');
    expect(getPosition('LEFT  JOIN  index  A').pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  As').pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  AS').pos).toBe('as');
    expect(getPosition('LEFT  JOIN  index  AS ').pos).toBe('after_as');
    expect(getPosition('LEFT  JOIN  index  AS  ').pos).toBe('after_as');
    expect(getPosition('LEFT  JOIN  index  AS a').pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS al2').pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS alias').pos).toBe('alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias ').pos).toBe('after_alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ').pos).toBe('after_alias');
    expect(getPosition('LEFT  JOIN  index  AS  alias  O').pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  On').pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON').pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON ').pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON  ').pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index  AS  alias  ON  a').pos).toBe('condition');
  });

  test('returns correct position, when no <alias> part specified', () => {
    expect(getPosition('LEFT  JOIN  index O').pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index ON').pos).toBe('on');
    expect(getPosition('LEFT  JOIN  index ON ').pos).toBe('after_on');
    expect(getPosition('LEFT  JOIN  index ON  ').pos).toBe('after_on');
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
    const suggestion1: ISuggestionItem = {
      label: 'id1',
      text: '',
      kind: 'Field',
      detail: '',
    };
    const suggestion2: ISuggestionItem = {
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
