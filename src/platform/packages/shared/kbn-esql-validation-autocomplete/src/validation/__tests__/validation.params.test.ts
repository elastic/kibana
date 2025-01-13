/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

test('should allow param inside agg function argument', async () => {
  const { validate } = await setup();

  const res1 = await validate('FROM index | STATS avg(?)');
  const res2 = await validate('FROM index | STATS avg(?named)');
  const res3 = await validate('FROM index | STATS avg(?123)');

  expect(res1).toMatchObject({ errors: [], warnings: [] });
  expect(res2).toMatchObject({ errors: [], warnings: [] });
  expect(res3).toMatchObject({ errors: [], warnings: [] });
});

test('allow params in WHERE command expressions', async () => {
  const { validate } = await setup();

  const res1 = await validate('FROM index | WHERE textField >= ?_tstart');
  const res2 = await validate(`
    FROM index
      | WHERE textField >= ?_tstart
      | WHERE textField <= ?0
      | WHERE textField == ?
  `);
  const res3 = await validate(`
    FROM index
      | WHERE textField >= ?_tstart
        AND textField <= ?0
        AND textField == ?
  `);

  expect(res1).toMatchObject({ errors: [], warnings: [] });
  expect(res2).toMatchObject({ errors: [], warnings: [] });
  expect(res3).toMatchObject({ errors: [], warnings: [] });
});

describe('allows named params', () => {
  test('WHERE boolean expression can contain a param', async () => {
    const { validate } = await setup();

    const res0 = await validate('FROM index | STATS var = ?func(?field) | WHERE var >= ?value');
    expect(res0).toMatchObject({ errors: [], warnings: [] });

    const res1 = await validate('FROM index | STATS var = ?param | WHERE var >= ?value');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('FROM index | STATS var = ?param | WHERE var >= ?value');
    expect(res2).toMatchObject({ errors: [], warnings: [] });

    const res3 = await validate('FROM index | STATS var = ?param | WHERE ?value >= var');
    expect(res3).toMatchObject({ errors: [], warnings: [] });
  });

  test('in column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?test');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW ?test, ?one_more, ?asldfkjasldkfjasldkfj');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?test.?test2');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW ?test, ?test.?test2.?test3');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names, where first part is not a param', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW not_a_param.?test2');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW not_a_param.?asdfasdfasdf, not_a_param.?test2.?test3');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in function name, function arg, and column name in STATS command', async () => {
    const { validate } = await setup();

    const res1 = await validate('FROM index | STATS x = max(doubleField) BY textField');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('FROM index | STATS x = max(?param1) BY textField');
    expect(res2).toMatchObject({ errors: [], warnings: [] });

    const res3 = await validate('FROM index | STATS x = max(?param1) BY ?param2');
    expect(res3).toMatchObject({ errors: [], warnings: [] });

    const res4 = await validate('FROM index | STATS x = ?param3(?param1) BY ?param2');
    expect(res4).toMatchObject({ errors: [], warnings: [] });

    const res5 = await validate(
      'FROM index | STATS x = ?param3(?param1, ?param4), y = ?param4(?param4, ?param4, ?param4) BY ?param2, ?param5'
    );
    expect(res5).toMatchObject({ errors: [], warnings: [] });
  });
});

describe('allows unnamed params', () => {
  test('in column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?');
    expect(res1).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?.?');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW ?, ?.?.?');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names, where first part is not a param', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW not_a_param.?');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW not_a_param.?, not_a_param.?.?');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in function name, function arg, and column name in STATS command', async () => {
    const { validate } = await setup();

    const res1 = await validate('FROM index | STATS x = max(doubleField) BY textField');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('FROM index | STATS x = max(?) BY textField');
    expect(res2).toMatchObject({ errors: [], warnings: [] });

    const res3 = await validate('FROM index | STATS x = max(?) BY ?');
    expect(res3).toMatchObject({ errors: [], warnings: [] });

    const res4 = await validate('FROM index | STATS x = ?(?) BY ?');
    expect(res4).toMatchObject({ errors: [], warnings: [] });

    const res5 = await validate('FROM index | STATS x = ?(?, ?), y = ?(?, ?, ?) BY ?, ?');
    expect(res5).toMatchObject({ errors: [], warnings: [] });
  });
});

describe('allows positional params', () => {
  test('in column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?0');
    expect(res1).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW ?0.?0');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW ?0, ?0.?0.?0');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in nested column names, where first part is not a param', async () => {
    const { validate } = await setup();

    const res1 = await validate('ROW not_a_param.?1');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('ROW not_a_param.?2, not_a_param.?3.?4');
    expect(res2).toMatchObject({ errors: [], warnings: [] });
  });

  test('in function name, function arg, and column name in STATS command', async () => {
    const { validate } = await setup();

    const res1 = await validate('FROM index | STATS x = max(doubleField) BY textField');
    expect(res1).toMatchObject({ errors: [], warnings: [] });

    const res2 = await validate('FROM index | STATS x = max(?0) BY textField');
    expect(res2).toMatchObject({ errors: [], warnings: [] });

    const res3 = await validate('FROM index | STATS x = max(?0) BY ?0');
    expect(res3).toMatchObject({ errors: [], warnings: [] });

    const res4 = await validate('FROM index | STATS x = ?1(?1) BY ?1');
    expect(res4).toMatchObject({ errors: [], warnings: [] });

    const res5 = await validate('FROM index | STATS x = ?0(?0, ?0), y = ?2(?2, ?2, ?2) BY ?3, ?3');
    expect(res5).toMatchObject({ errors: [], warnings: [] });
  });
});
