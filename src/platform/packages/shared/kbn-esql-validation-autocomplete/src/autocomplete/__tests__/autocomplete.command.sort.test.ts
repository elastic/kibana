/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  setup,
  getFieldNamesByType,
  attachTriggerCommand,
  getFunctionSignaturesByReturnType,
} from './helpers';

describe('autocomplete.suggest', () => {
  describe('SORT ( <column> [ ASC / DESC ] [ NULLS FIST / NULLS LAST ] )+', () => {
    describe('SORT <column> ...', () => {
      const expectedFieldSuggestions = getFieldNamesByType('any').map(attachTriggerCommand);
      const expectedFunctionSuggestions = getFunctionSignaturesByReturnType('sort', 'any', {
        scalar: true,
      }).map(attachTriggerCommand);

      test('suggests column', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort /', [
          ...expectedFieldSuggestions,
          ...expectedFunctionSuggestions,
        ]);
        await assertSuggestions('from a | sort keyw/', [
          ...expectedFieldSuggestions,
          ...expectedFunctionSuggestions,
        ]);
        await assertSuggestions(
          'from a | sort keywordField/',
          [
            {
              filterText: 'keywordField',
              text: 'keywordField, ',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField | ',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField ASC',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField DESC',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField NULLS FIRST',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField NULLS LAST',
            },
          ].map(attachTriggerCommand)
        );

        await assertSuggestions(
          'from a | sort `keywordField`/',
          [
            {
              filterText: '`keywordField`',
              text: '`keywordField`, ',
            },
            {
              filterText: '`keywordField`',
              text: '`keywordField` | ',
            },
            {
              filterText: '`keywordField`',
              text: '`keywordField` ASC',
            },
            {
              filterText: '`keywordField`',
              text: '`keywordField` DESC',
            },
            {
              filterText: '`keywordField`',
              text: '`keywordField` NULLS FIRST',
            },
            {
              filterText: '`keywordField`',
              text: '`keywordField` NULLS LAST',
            },
          ].map(attachTriggerCommand)
        );
      });
      it('suggests subsequent column after comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort keywordField, /', [
          ...expectedFieldSuggestions,
          ...expectedFunctionSuggestions,
        ]);
        await assertSuggestions('from a | sort keywordField, doubl/', [
          ...expectedFieldSuggestions,
          ...expectedFunctionSuggestions,
        ]);
        await assertSuggestions(
          'from a | sort keywordField, doubleField/',
          [
            {
              filterText: 'doubleField',
              text: 'doubleField, ',
            },
            {
              filterText: 'doubleField',
              text: 'doubleField | ',
            },
            {
              filterText: 'doubleField',
              text: 'doubleField ASC',
            },
            {
              filterText: 'doubleField',
              text: 'doubleField DESC',
            },
            {
              filterText: 'doubleField',
              text: 'doubleField NULLS FIRST',
            },
            {
              filterText: 'doubleField',
              text: 'doubleField NULLS LAST',
            },
          ].map(attachTriggerCommand)
        );
      });
    });

    describe('... [ ASC / DESC ] ...', () => {
      test('suggests all modifiers on first space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField /',
          ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST', ', ', '| '].map(attachTriggerCommand)
        );
      });

      test('when user starts to type ASC modifier', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField A/',
          ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField ASC/',
          ['ASC NULLS FIRST', 'ASC NULLS LAST', 'ASC, ', 'ASC | '].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField asc/',
          ['asc NULLS FIRST', 'asc NULLS LAST', 'asc, ', 'asc | '].map(attachTriggerCommand)
        );
      });

      test('when user starts to type DESC modifier', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField D/',
          ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField DESC/',
          ['DESC NULLS FIRST', 'DESC NULLS LAST', 'DESC, ', 'DESC | '].map(attachTriggerCommand)
        );
        await assertSuggestions('from a | sort stringField desc/', [
          'desc NULLS FIRST',
          'desc NULLS LAST',
          'desc, ',
          'desc | ',
        ]);
      });
    });

    describe('... [ NULLS FIRST / NULLS LAST ]', () => {
      test('suggests nulls modifier after order modifier + space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField ASC /', [
          'NULLS FIRST',
          'NULLS LAST',
          ', ',
          '| ',
        ]);
      });

      test('when user starts to type NULLS modifiers', async () => {
        const { assertSuggestions } = await setup();

        // @TODO check for replacement range
        await assertSuggestions('from a | sort stringField N/', [
          'ASC',
          'DESC',
          'NULLS FIRST',
          'NULLS LAST',
        ]);
        await assertSuggestions('from a | sort stringField null/', [
          'ASC',
          'DESC',
          'NULLS FIRST',
          'NULLS LAST',
        ]);
        await assertSuggestions('from a | sort stringField nulls/', [
          'ASC',
          'DESC',
          'NULLS FIRST',
          'NULLS LAST',
        ]);
        await assertSuggestions('from a | sort stringField nulls /', [
          'ASC',
          'DESC',
          'NULLS FIRST',
          'NULLS LAST',
        ]);
      });

      test('when user types NULLS FIRST', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField NULLS F/',
          [
            'ASC',
            'DESC',
            { text: 'NULLS LAST', rangeToReplace: { start: 27, end: 34 } },
            { text: 'NULLS FIRST', rangeToReplace: { start: 27, end: 34 } },
          ].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField NULLS FI/',
          [
            'ASC',
            'DESC',
            { text: 'NULLS LAST', rangeToReplace: { start: 27, end: 35 } },
            { text: 'NULLS FIRST', rangeToReplace: { start: 27, end: 35 } },
          ].map(attachTriggerCommand)
        );
      });

      test('when user types NULLS LAST', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField NULLS L/',
          ['ASC', 'DESC', 'NULLS LAST', 'NULLS FIRST'].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField NULLS LAS/',
          ['ASC', 'DESC', 'NULLS LAST', 'NULLS FIRST'].map(attachTriggerCommand)
        );
      });

      test('after nulls are entered, suggests comma or pipe', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField NULLS LAST /',
          [', ', '| '].map(attachTriggerCommand)
        );
      });
    });
  });
});
