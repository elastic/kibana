/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';
import { runSubqueriesValidationSuite } from './subqueries_suite';

runSubqueriesValidationSuite(setup);

it('does not count the unmapped fields of a nested IN subquery as outer columns', async () => {
  const { expectErrors } = await setup();

  await expectErrors(
    'SET unmapped_fields = "LOAD"; FROM index | WHERE keywordField IN (ROW keywordField = "a" | WHERE keywordField IN (FROM index | KEEP innerOnly))',
    []
  );
});

it('keeps the unmapped fields of a FORK branch as columns', async () => {
  const { expectErrors } = await setup();

  await expectErrors(
    'SET unmapped_fields = "LOAD"; FROM index | WHERE (keywordField, innerOnly) IN (ROW keywordField = "a" | FORK (WHERE innerOnly == "x") (LIMIT 1) | DROP _fork)',
    []
  );
});

it('counts only surviving columns after wildcard DROP and KEEP in an IN subquery', async () => {
  const { expectErrors } = await setup();

  await expectErrors('ROW x = 1 | WHERE x IN (ROW a = 1, tmp1 = 2 | DROP tmp* | KEEP a, *)', []);
});
