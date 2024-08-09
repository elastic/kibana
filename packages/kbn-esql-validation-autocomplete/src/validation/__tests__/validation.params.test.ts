/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  const res1 = await validate('FROM index | WHERE textField >= ?start');
  const res2 = await validate(`
    FROM index
      | WHERE textField >= ?start
      | WHERE textField <= ?0
      | WHERE textField == ?
  `);
  const res3 = await validate(`
    FROM index
      | WHERE textField >= ?start
        AND textField <= ?0
        AND textField == ?
  `);

  expect(res1).toMatchObject({ errors: [], warnings: [] });
  expect(res2).toMatchObject({ errors: [], warnings: [] });
  expect(res3).toMatchObject({ errors: [], warnings: [] });
});
