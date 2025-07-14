/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../definitions/utils/test_mocks';
import { validate } from './validate';
import { expectErrors } from '../../../definitions/utils/test_functions';
import { METADATA_FIELDS } from '../../../..';

const fuseExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'fuse', validate);
};

describe('FUSE Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FUSE', () => {
    test('no errors for valid command', () => {
      const newFields = new Map(mockContext.fields);
      METADATA_FIELDS.forEach((fieldName) => {
        newFields.set(fieldName, { name: fieldName, type: 'keyword' });
      });
      const context = {
        ...mockContext,
        fields: newFields,
      };
      fuseExpectErrors(
        `FROM index METADATA _id, _score, _index
                    | FORK
                      (WHERE keywordField != "" | LIMIT 100)
                      (SORT doubleField ASC NULLS LAST)
                    | FUSE`,
        [],
        context
      );
    });

    test('requires _id, _index and _score metadata to be selected in the FROM command', () => {
      fuseExpectErrors(
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
