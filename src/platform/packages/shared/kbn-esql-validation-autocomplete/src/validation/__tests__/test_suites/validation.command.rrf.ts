/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationRrfCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('RRF', () => {
        test('no errors for valid command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | RRF`,
            []
          );
        });

        test('requires to be preceded by a FORK command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index METADATA _id, _score, _index | RRF`, [
            '[RRF] Must be immediately preceded by a FORK command.',
          ]);
        });

        test('requires to be immediately preceded by a FORK command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | SORT _id
                    | RRF`,
            ['[RRF] Must be immediately preceded by a FORK command.']
          );
        });

        test('requires _id, _index and _score metadata to be selected in the FROM command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | RRF`,
            [
              '[RRF] The FROM command is missing the _id METADATA field.',
              '[RRF] The FROM command is missing the _index METADATA field.',
              '[RRF] The FROM command is missing the _score METADATA field.',
            ]
          );
        });
      });
    });
  });
};
