/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationFuseCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('FUSE', () => {
        test('no errors for valid command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
            []
          );
        });

        test('requires _id, _index and _score metadata to be selected in the FROM command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
            [
              '[FUSE] The FROM command is missing the _id METADATA field.',
              '[FUSE] The FROM command is missing the _index METADATA field.',
              '[FUSE] The FROM command is missing the _score METADATA field.',
            ]
          );
        });
      });
    });
  });
};
