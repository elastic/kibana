/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('field and variable escaping', () => {
  it('recognizes escaped fields', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors(
      'FROM index | KEEP `kubernetes`.`something`.`something` | EVAL `kubernetes.something.something` + 12',
      []
    );
    // function argument
    await expectErrors('FROM index | EVAL ABS(`kubernetes`.`something`.`something`)', []);
  });

  it('recognizes field names with spaces and comments', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors('FROM index | KEEP kubernetes . something . /* gotcha! */ something', []);
    // function argument
    await expectErrors(
      'FROM index | EVAL ABS(kubernetes . something . /* gotcha! */ something)',
      []
    );
  });

  it('recognizes escaped variables', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors('ROW `var$iable` = 1 | EVAL `var$iable`', []);

    // command level, different escaping in declaration
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | EVAL `variable`.`wi#th`.`separator`',
      []
    );

    // function arguments
    await expectErrors(
      'ROW `var$iable` = 1, variable.`wi#th`.separator = "lolz" | EVAL ABS(`var$iable`), TRIM(variable.`wi#th`.`separator`)',
      []
    );
  });

  it('recognizes variables with spaces and comments', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | RENAME variable . /* lolz */ `wi#th` . separator AS foo',
      []
    );
    // function argument
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | EVAL TRIM(variable . /* lolz */ `wi#th` . separator)',
      []
    );
  });

  describe('as part of various commands', () => {
    const cases = [
      { name: 'ROW', command: 'ROW `var$iable` = 1, variable.`wi#th`.separator = "lolz"' },
      {
        name: 'DISSECT',
        command: 'ROW `funky`.`stri#$ng` = "lolz" | DISSECT `funky`.`stri#$ng` "%{WORD:firstWord}"',
      },
      { name: 'DROP', command: 'FROM index | DROP kubernetes.`something`.`something`' },
      // { name: 'ENRICH', command: 'ENRICH' },
      { name: 'EVAL', command: 'FROM index | EVAL kubernetes.`something`.`something` + 12' },
      {
        name: 'GROK',
        command: 'ROW `funky`.`stri#$ng` = "lolz" | GROK `funky`.`stri#$ng` "%{WORD:firstWord}"',
      },
      { name: 'KEEP', command: 'FROM index | KEEP kubernetes.`something`.`something`' },
      {
        name: 'RENAME',
        command: 'FROM index | RENAME kubernetes.`something`.`something` as foobar',
      },
      { name: 'SORT', command: 'FROM index | SORT kubernetes.`something`.`something` DESC' },
      {
        name: 'STATS ... BY',
        command:
          'FROM index | STATS AVG(kubernetes.`something`.`something`) BY `kubernetes`.`something`.`something`',
      },
      { name: 'WHERE', command: 'FROM index | WHERE kubernetes.`something`.`something` == 12' },
    ];

    it.each(cases)('$name accepts escaped fields', async ({ command }) => {
      const { expectErrors } = await setup();
      await expectErrors(command, []);
    });
  });
});
