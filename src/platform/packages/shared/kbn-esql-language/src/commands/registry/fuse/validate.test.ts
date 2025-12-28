/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { expectErrors } from '../../../__tests__/commands/validation';
import { validate } from './validate';

const fuseExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'fuse', validate);
};

describe('FUSE Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FUSE', () => {
    test('no errors for valid command', () => {
      fuseExpectErrors(
        `FROM index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
        []
      );

      fuseExpectErrors(
        `TS index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
        []
      );
    });

    test('requires _id, _index and _score metadata to be selected in the FROM command', () => {
      fuseExpectErrors(
        `FROM index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
        ['[FUSE] The FROM command is missing the _id, _index, _score METADATA field.']
      );
    });

    test('requires _id metadata to be selected in the FROM command', () => {
      fuseExpectErrors(
        `FROM index METADATA _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
        ['[FUSE] The FROM command is missing the _id METADATA field.']
      );
    });
  });
});
