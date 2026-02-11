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

const fromExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'from', validate);
};

describe('FROM Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FROM <sources> [ METADATA <indices> ]', () => {
    describe('... <sources> ...', () => {
      test('no errors on correct indices usage', () => {
        fromExpectErrors('from index', []);
        fromExpectErrors('FROM index', []);
        fromExpectErrors('FROM "index"', []);
        fromExpectErrors('FROM """index"""', []);
        fromExpectErrors('FrOm index', []);
        fromExpectErrors('from index, other_index', []);
        fromExpectErrors('from index, other_index,.secret_index', []);
        fromExpectErrors('from .secret_index', []);
        fromExpectErrors('from .secret_index', []);
        fromExpectErrors('from .secret_index', []);
        fromExpectErrors('from ind*, other*', []);
        fromExpectErrors('from index*', []);
        fromExpectErrors('FROM *a_i*dex*', []);
        fromExpectErrors('FROM in*ex*', []);
        fromExpectErrors('FROM *n*ex', []);
        fromExpectErrors('FROM *n*ex*', []);
        fromExpectErrors('FROM i*d*x*', []);
        fromExpectErrors('FROM i*d*x', []);
        fromExpectErrors('FROM i***x*', []);
        fromExpectErrors('FROM i****', []);
        fromExpectErrors('FROM i**', []);
        fromExpectErrors('fRoM index**', []);
        fromExpectErrors('fRoM *ex', []);
        fromExpectErrors('fRoM *ex*', []);
        fromExpectErrors('fRoM in*ex', []);
        fromExpectErrors('fRoM ind*ex', []);
        fromExpectErrors('fRoM *,-.*', []);
        fromExpectErrors('fRoM .secret_index', []);
        fromExpectErrors('from my-index', []);

        fromExpectErrors('FROM index, missingIndex*', []);
        fromExpectErrors('FROM index, lol*catz', []);
        fromExpectErrors('FROM index*, lol*catz', []);
        fromExpectErrors('FROM missingIndex*, index', []);
        fromExpectErrors('FROM missingIndex*, missingIndex2*, index', []);
      });

      test('errors on trailing comma', () => {
        fromExpectErrors(`from assignment = 1`, ['Unknown index "assignment"']);
      });

      test('errors on invalid syntax', () => {
        fromExpectErrors('FROM `index`', ['Unknown index "`index`"']);
        fromExpectErrors(`from assignment = 1`, ['Unknown index "assignment"']);
      });

      test('errors on unknown index', () => {
        fromExpectErrors(`FROM index, missingIndex`, ['Unknown index "missingIndex"']);
        fromExpectErrors(`from average()`, ['Unknown index "average"']);
        fromExpectErrors(`fRom custom_function()`, ['Unknown index "custom_function"']);
        fromExpectErrors('from numberField', ['Unknown index "numberField"']);
        fromExpectErrors('FROM policy', ['Unknown index "policy"']);
        fromExpectErrors('FROM index, missingIndex', ['Unknown index "missingIndex"']);
        fromExpectErrors('FROM missingIndex, index', ['Unknown index "missingIndex"']);
        fromExpectErrors('FROM *missingIndex, missingIndex2, index', [
          'Unknown index "missingIndex2"',
        ]);
      });
      test('no errors on unknown index if using wildcards', () => {
        fromExpectErrors(`FROM indexes*`, []);
        fromExpectErrors('FROM missingIndex*', []);
        fromExpectErrors('FROM *missingIndex, missing*Index2', []);
      });
    });

    describe('... METADATA <indices>', () => {
      test('no errors on correct METADATA ... usage', () => {
        fromExpectErrors('from index metadata _id', []);
        fromExpectErrors('from index metadata _id, \t\n _index\n ', []);
      });

      describe('validates fields', () => {
        test('validates fields', () => {
          fromExpectErrors(`from index METADATA _id, _source2`, [
            `Metadata field "_source2" is not available. Available metadata fields are: [${METADATA_FIELDS.join(
              ', '
            )}]`,
          ]);
        });
      });
    });
  });

  describe('CCS indices', () => {
    describe('... <sources> ...', () => {
      test('display errors on unknown indices', () => {
        fromExpectErrors('fRoM remote-ccs:indexes', ['Unknown index "remote-ccs:indexes"']);
        fromExpectErrors('fRoM a_index, remote-ccs:indexes', [
          'Unknown index "remote-ccs:indexes"',
        ]);
      });
      test('no errors on unknown index if using wildcards', () => {
        fromExpectErrors('fRoM remote-*:indexes', []);
        fromExpectErrors('from remote-*:indexes*', []);
      });
    });

    describe('... METADATA <indices>', () => {
      test('no errors on correct usage', () => {
        fromExpectErrors(`from remote-ccs:indexes METADATA _id`, [
          'Unknown index "remote-ccs:indexes"',
        ]);
        fromExpectErrors(`from *:indexes METADATA _id`, []);
      });
    });
  });
});
