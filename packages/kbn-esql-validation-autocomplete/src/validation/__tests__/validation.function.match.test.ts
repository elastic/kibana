/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('MATCH function validation', () => {
  it('no error if valid', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | WHERE MATCH(keywordField, "value") | LIMIT 10 ', []);
    await expectErrors(
      'FROM index | EVAL a=CONCAT(keywordField, "_") | WHERE MATCH(a, "value") | LIMIT 10 ',
      []
    );
  });

  it('shows errors if after incompatible commands ', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | LIMIT 10 | WHERE MATCH(keywordField, "value")', [
      'MATCH cannot be used after LIMIT',
    ]);

    for (const command of ['EVAL']) {
      await expectErrors(`FROM index | ${command} MATCH(keywordField, "value")`, [
        `${command} does not support function match`,
      ]);
    }
  });

  it('shows errors if argument is not an index field ', async () => {
    const { expectErrors } = await setup();
    await expectErrors(
      'FROM index | LIMIT 10 | where MATCH(`kubernetes.something.something`, "value")',
      [
        'Argument of [match] must be [keyword], found value [kubernetes.something.something] type [double]',
        'MATCH cannot be used after LIMIT',
      ]
    );

    await expectErrors('FROM index | where MATCH(TO_STRING(keywordField), "value")', []);
  });
});
