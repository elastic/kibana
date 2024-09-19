/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup, getFieldNamesByType, attachTriggerCommand } from './helpers';

describe('autocomplete.suggest', () => {
  describe('SORT ( <column> [ ASC / DESC ] [ NULLS FIST / NULLS LAST ] )+', () => {
    describe('SORT <column> ...', () => {
      test.only('suggests column on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort /',
          [...getFieldNamesByType('any')].map((field) => `${field} `).map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort keyw/',
          [...getFieldNamesByType('any')].map((field) => `${field} `).map(attachTriggerCommand)
        );
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
              text: 'keywordField ASC ',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField DESC ',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField NULLS FIRST ',
            },
            {
              filterText: 'keywordField',
              text: 'keywordField NULLS LAST ',
            },
          ].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort column, /',
          [...getFieldNamesByType('any')].map((field) => `${field} `).map(attachTriggerCommand)
        );
      });

      test('partial columns', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort /',
          [...getFieldNamesByType('any')].map((field) => `${field} `).map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort column, /',
          [...getFieldNamesByType('any')].map((field) => `${field} `).map(attachTriggerCommand)
        );
      });
    });

    describe('... [ ASC / DESC ] ...', () => {
      test('suggests all modifiers on first space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField /',
          ['ASC ', 'DESC ', 'NULLS FIRST ', 'NULLS LAST ', ', ', '| '].map(attachTriggerCommand)
        );
      });

      test('when user starts to type ASC modifier', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField A/', ['ASC ']);
      });

      test('when user starts to type DESC modifier', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField d/', ['DESC ']);
        await assertSuggestions('from a | sort stringField des/', ['DESC ']);
        await assertSuggestions('from a | sort stringField DES/', ['DESC ']);
      });
    });

    describe('... [ NULLS FIST / NULLS LAST ]', () => {
      test('suggests command on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField ASC /', [
          'NULLS FIRST ',
          'NULLS LAST ',
          ',',
          '| ',
        ]);
      });

      test('when user starts to type NULLS modifiers', async () => {
        const { assertSuggestions } = await setup();

        // @TODO check for replacement range
        await assertSuggestions('from a | sort stringField N/', ['NULLS FIRST ', 'NULLS LAST ']);
        await assertSuggestions('from a | sort stringField null/', ['NULLS FIRST ', 'NULLS LAST ']);
        await assertSuggestions('from a | sort stringField nulls/', [
          'NULLS FIRST ',
          'NULLS LAST ',
        ]);
        await assertSuggestions('from a | sort stringField nulls /', [
          'NULLS FIRST ',
          'NULLS LAST ',
        ]);
      });

      test('when user types NULLS FIRST', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField NULLS F/',
          ['NULLS FIRST '].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField NULLS FI/',
          ['NULLS FIRST '].map(attachTriggerCommand)
        );
      });

      test('when user types NULLS LAST', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | sort stringField NULLS L/',
          ['NULLS LAST '].map(attachTriggerCommand)
        );
        await assertSuggestions(
          'from a | sort stringField NULLS LAS/',
          ['NULLS LAST '].map(attachTriggerCommand)
        );
      });

      test('after nulls are entered, suggests comma or pipe', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField NULLS LAST /', [',', '| ']);
      });
    });
  });
});
