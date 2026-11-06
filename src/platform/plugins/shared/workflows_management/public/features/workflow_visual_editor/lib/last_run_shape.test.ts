/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { describeLastRunShape, parseStepOutputReference } from './last_run_shape';

describe('parseStepOutputReference', () => {
  it.each([
    ['steps.search.output', { stepName: 'search', path: [] }],
    ['steps.search.output.hits.total', { stepName: 'search', path: ['hits', 'total'] }],
    [
      'steps.get-index.output.hits.hits.0._id',
      {
        stepName: 'get-index',
        path: ['hits', 'hits', '0', '_id'],
      },
    ],
    ['  steps.a.output.b  ', { stepName: 'a', path: ['b'] }],
  ])('reads %p', (expression, expected) => {
    expect(parseStepOutputReference(expression)).toEqual(expected);
  });

  it.each([
    'steps.a.error',
    'steps.a',
    'foreach.item',
    'steps.a.output.b | json',
    'steps.a.output.b != blank',
    "steps.a.output['b']",
    'steps.a.output.',
    'steps..output',
  ])('does not read %p', (expression) => {
    expect(parseStepOutputReference(expression)).toBeUndefined();
  });
});

describe('describeLastRunShape', () => {
  const output = {
    hits: { total: 3, hits: [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }] },
    name: 'x',
    ok: true,
    nothing: null,
    one: [1],
    empty: [],
  };

  it.each([
    [[], 'record, 6 fields'],
    [['hits'], 'record, 2 fields'],
    [['hits', 'hits'], 'list, 3 items'],
    [['one'], 'list, 1 item'],
    [['empty'], 'list, 0 items'],
    [['hits', 'hits', '1'], 'record, 1 field'],
    [['hits', 'hits', '1', '_id'], 'string'],
    [['hits', 'total'], 'number'],
    [['ok'], 'boolean'],
    [['nothing'], 'null'],
  ])('describes %p as %p', (path, expected) => {
    expect(describeLastRunShape(output, path)).toBe(expected);
  });

  it.each([
    [['missing']],
    [['hits', 'hits', '9']],
    [['name', 'deeper']],
    [['nothing', 'deeper']],
    [['hits', 'hits', 'length']],
  ])('says nothing when %p does not resolve', (path) => {
    expect(describeLastRunShape(output, path)).toBeUndefined();
  });

  it('says nothing when the step had no output', () => {
    expect(describeLastRunShape(undefined, [])).toBeUndefined();
    expect(describeLastRunShape(undefined, ['a'])).toBeUndefined();
  });
});
