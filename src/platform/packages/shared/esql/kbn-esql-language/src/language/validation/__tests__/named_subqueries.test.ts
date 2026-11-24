/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';
import { runNamedSubqueriesValidationSuite } from './named_subqueries_suite';

runNamedSubqueriesValidationSuite(setup);

it('keeps SET unmapped_fields for the columns of an IN subquery in a LET body', async () => {
  const { expectErrors } = await setup();

  await expectErrors(
    'SET unmapped_fields = "LOAD"; LET a = (FROM index | WHERE (keywordField, unmapped) IN (FROM other_index | KEEP keywordField, unmapped)); FROM a',
    []
  );
});

// The integration cluster uses a Basic license, which cannot run FUSE.
it.each([
  ['LET a = (FROM index METADATA _id, _index, _score); FROM a', []],
  [
    'LET a = (FROM index); FROM a',
    ['[FUSE] The FROM command is missing the _id, _index, _score METADATA field.'],
  ],
  [
    'LET a = (FROM index METADATA _id, _index); FROM a METADATA _id',
    ['[FUSE] The FROM command is missing the _score METADATA field.'],
  ],
  [
    'LET a = (FROM index | WHERE keywordField IN (FROM other_index METADATA _id, _index, _score | KEEP keywordField)); FROM a',
    ['[FUSE] The FROM command is missing the _id, _index, _score METADATA field.'],
  ],
])('validates the METADATA FUSE inherits in %s', async (query, expectedErrors) => {
  const { expectErrors } = await setup();

  await expectErrors(`${query} | FORK (LIMIT 10) (LIMIT 10) | FUSE`, expectedErrors);
});
