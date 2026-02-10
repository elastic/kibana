/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '../../../parser';
import { isSubQuery } from '../../../ast/is';
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
        fromExpectErrors(`from assignment = 1`, ['Unknown index or view "assignment"']);
      });

      test('errors on invalid syntax', () => {
        fromExpectErrors('FROM `index`', ['Unknown index or view "`index`"']);
        fromExpectErrors(`from assignment = 1`, ['Unknown index or view "assignment"']);
      });

      test('errors on unknown index or view', () => {
        fromExpectErrors(`FROM index, missingIndex`, ['Unknown index or view "missingIndex"']);
        fromExpectErrors(`from average()`, ['Unknown index or view "average"']);
        fromExpectErrors(`fRom custom_function()`, ['Unknown index or view "custom_function"']);
        fromExpectErrors('from numberField', ['Unknown index or view "numberField"']);
        fromExpectErrors('FROM policy', ['Unknown index or view "policy"']);
        fromExpectErrors('FROM index, missingIndex', ['Unknown index or view "missingIndex"']);
        fromExpectErrors('FROM missingIndex, index', ['Unknown index or view "missingIndex"']);
        fromExpectErrors('FROM *missingIndex, missingIndex2, index', [
          'Unknown index or view "missingIndex2"',
        ]);
      });
      test('no errors on unknown index if using wildcards', () => {
        fromExpectErrors(`FROM indexes*`, []);
        fromExpectErrors('FROM missingIndex*', []);
        fromExpectErrors('FROM *missingIndex, missing*Index2', []);
      });

      test('no errors when using a view name from context.views', () => {
        const contextWithViews = {
          ...mockContext,
          views: [
            { name: 'my_saved_view', query: 'FROM logs | LIMIT 10' },
            { name: 'my-view', query: 'FROM metrics' },
          ],
        };
        fromExpectErrors('FROM my_saved_view', [], contextWithViews);
        fromExpectErrors('FROM my_saved_view, index', [], contextWithViews);
        fromExpectErrors('FROM "my-view"', [], contextWithViews);
      });

      test('errors on unknown view when views are provided but name is not in list', () => {
        const contextWithViews = {
          ...mockContext,
          views: [{ name: 'my_saved_view', query: 'FROM logs' }],
        };
        fromExpectErrors(
          'FROM other_view',
          ['Unknown index or view "other_view"'],
          contextWithViews
        );
      });

      test('uses "Unknown index" (not "Unknown index or view") for unknown source inside subquery', () => {
        const query = 'FROM index, (FROM missingIndex)';
        const { root } = Parser.parse(query);
        const rootFrom = root.commands[0];
        const subqueryArg = rootFrom.args.find((arg) => !Array.isArray(arg) && isSubQuery(arg)) as {
          child: { commands: typeof root.commands };
        };
        const innerFrom = subqueryArg.child.commands[0];
        const result = validate(innerFrom, root.commands, mockContext);
        const errors = result.map((e) => e.text);
        expect(errors).toEqual(['Unknown index "missingIndex"']);
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
        fromExpectErrors('fRoM remote-ccs:indexes', ['Unknown index or view "remote-ccs:indexes"']);
        fromExpectErrors('fRoM a_index, remote-ccs:indexes', [
          'Unknown index or view "remote-ccs:indexes"',
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
          'Unknown index or view "remote-ccs:indexes"',
        ]);
        fromExpectErrors(`from *:indexes METADATA _id`, []);
      });
    });
  });
});
