/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('validation', () => {
  describe('MATCH function', () => {
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
        '[MATCH] function cannot be used after LIMIT',
      ]);

      await expectErrors(`FROM index | EVAL MATCH(a, "value")`, [
        'EVAL does not support function match',
        '[MATCH] function is only supported in WHERE commands',
      ]);
    });

    it('shows errors if argument is not an index field ', async () => {
      const { expectErrors } = await setup();
      await expectErrors(
        'FROM index | LIMIT 10 | where MATCH(`kubernetes.something.something`, "value")',
        [
          'Argument of [match] must be [keyword], found value [kubernetes.something.something] type [double]',
          '[MATCH] function cannot be used after LIMIT',
        ]
      );
    });
  });
  describe('QSRT function', () => {
    it('no error if valid', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | WHERE QSTR("keywordField:value") | LIMIT 10 ', []);
    });

    it('shows errors if comes after incompatible functions or commands ', async () => {
      const { expectErrors } = await setup();
      await expectErrors('ROW a = 1, b = "two", c = null | WHERE QSTR("keywordField:value")', [
        '[QSTR] function cannot be used after ROW',
      ]);
      for (const clause of [
        { command: 'LIMIT', clause: 'LIMIT 10' },
        { command: 'EVAL', clause: 'EVAL a=CONCAT(keywordField, "_")' },
        { command: 'KEEP', clause: 'KEEP keywordField' },
        { command: 'RENAME', clause: 'RENAME keywordField as a' },
        { command: 'STATS', clause: 'STATS avg(doubleField) by keywordField' },
      ]) {
        await expectErrors(`FROM index | ${clause.clause} | WHERE QSTR("keywordField:value")`, [
          `[QSTR] function cannot be used after ${clause.command}`,
        ]);
      }
      await expectErrors(`FROM index | EVAL QSTR("keywordField:value")`, [
        `EVAL does not support function qstr`,
        '[QSTR] function cannot be used after EVAL',
      ]);

      await expectErrors(`FROM index | STATS avg(doubleField) by QSTR("keywordField:value")`, [
        `STATS BY does not support function qstr`,
      ]);
    });
  });
});
