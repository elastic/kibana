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

// The integration cluster uses a Basic license, which cannot run FUSE.
it('reports missing METADATA on FUSE even when it inherits it from a LET', async () => {
  const { expectErrors } = await setup();
  const query =
    'LET a = (FROM index METADATA _id, _index, _score | KEEP _id, _index, _score); FROM a | FORK (LIMIT 10) (LIMIT 10) | FUSE';

  await expectErrors(query, [
    '[FUSE] The FROM command is missing the _id, _index, _score METADATA field.',
  ]);
});
