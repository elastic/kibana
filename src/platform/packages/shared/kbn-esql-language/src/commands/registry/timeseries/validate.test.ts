/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { METADATA_FIELDS } from '../options/metadata';

const tsExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'ts', validate);
};

describe('TS Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TS <sources> [ METADATA <indices> ]', () => {
    describe('... <sources> ...', () => {
      test('no errors on correct indices usage', () => {
        tsExpectErrors('TS index', []);
        tsExpectErrors('TS index', []);
        tsExpectErrors('TS "index"', []);
        tsExpectErrors('TS """index"""', []);
        tsExpectErrors('TS index', []);
        tsExpectErrors('TS index, other_index', []);
        tsExpectErrors('TS index, other_index,.secret_index', []);
        tsExpectErrors('TS .secret_index', []);
        tsExpectErrors('TS .secret_index', []);
        tsExpectErrors('TS .secret_index', []);
        tsExpectErrors('TS ind*, other*', []);
        tsExpectErrors('TS index*', []);
        tsExpectErrors('TS *a_i*dex*', []);
        tsExpectErrors('TS in*ex*', []);
        tsExpectErrors('TS *n*ex', []);
        tsExpectErrors('TS *n*ex*', []);
        tsExpectErrors('TS i*d*x*', []);
        tsExpectErrors('TS i*d*x', []);
        tsExpectErrors('TS i***x*', []);
        tsExpectErrors('TS i****', []);
        tsExpectErrors('TS i**', []);
        tsExpectErrors('TS index**', []);
        tsExpectErrors('TS *ex', []);
        tsExpectErrors('TS *ex*', []);
        tsExpectErrors('TS in*ex', []);
        tsExpectErrors('TS ind*ex', []);
        tsExpectErrors('TS *,-.*', []);
        tsExpectErrors('TS .secret_index', []);
        tsExpectErrors('TS my-index', []);

        tsExpectErrors('TS index, missingIndex*', []);
        tsExpectErrors('TS index, lol*catz', []);
        tsExpectErrors('TS index*, lol*catz', []);
        tsExpectErrors('TS missingIndex*, index', []);
        tsExpectErrors('TS missingIndex*, missingIndex2*, index', []);
      });

      test('errors on trailing comma', () => {
        tsExpectErrors(`TS assignment = 1`, ['Unknown index "assignment"']);
      });

      test('errors on invalid syntax', () => {
        tsExpectErrors('TS `index`', ['Unknown index "`index`"']);
        tsExpectErrors(`TS assignment = 1`, ['Unknown index "assignment"']);
      });

      test('errors on unknown index', () => {
        tsExpectErrors(`TS index, missingIndex`, ['Unknown index "missingIndex"']);
        tsExpectErrors(`TS average()`, ['Unknown index "average"']);
        tsExpectErrors(`TS custom_function()`, ['Unknown index "custom_function"']);
        tsExpectErrors('TS numberField', ['Unknown index "numberField"']);
        tsExpectErrors('TS policy', ['Unknown index "policy"']);

        tsExpectErrors('TS *missingIndex, missingIndex2, index', ['Unknown index "missingIndex2"']);
        tsExpectErrors('TS index, missingIndex', ['Unknown index "missingIndex"']);
        tsExpectErrors('TS missingIndex, index', ['Unknown index "missingIndex"']);
      });

      test('no errors on unknown index if using wildcards', () => {
        tsExpectErrors(`TS indexes*`, []);
        tsExpectErrors('TS missingIndex*', []);
        tsExpectErrors('TS *missingIndex, missing*Index2', []);
      });
    });

    describe('... METADATA <indices>', () => {
      test('no errors on correct METADATA ... usage', () => {
        tsExpectErrors('TS index metadata _id', []);
        tsExpectErrors('TS index metadata _id, \t\n _index\n ', []);
      });

      describe('validates fields', () => {
        test('validates fields', () => {
          tsExpectErrors(`TS index METADATA _id, _source2`, [
            `Metadata field "_source2" is not available. Available metadata fields are: [${METADATA_FIELDS.join(
              ', '
            )}]`,
          ]);
        });
      });
    });
  });
});
