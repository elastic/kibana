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
import { setup } from '../../../language/validation/__tests__/helpers';
import { validate } from './validate';

const check = (query: string, errors: string[] = []) =>
  expectErrors(query, errors, mockContext, 'fillnull', validate);

describe('FILLNULL validation', () => {
  it.each(['DEFAULT', 'NULL', '0', '-1.5', 'true', '"unknown"', '?value', '?1'])(
    'accepts %s without treating the fill value as a column',
    (value) => {
      check(`FROM index | FILLNULL ${value} ON keywordField, doubleField`);
    }
  );

  it.each(['*', 'double*', '*Field', 'keywordField, double*', '`any#Char$Field`'])(
    'accepts field names and patterns: %s',
    (fields) => {
      check(`FROM index | FILLNULL DEFAULT ON ${fields}`);
    }
  );

  it.each(['missing', 'missing*'])('reports unresolved target %s', (field) => {
    check(`FROM index | FILLNULL DEFAULT ON ${field}`, [`Unknown column "${field}"`]);
  });

  it('leaves unsupported field types to server warnings', () => {
    const columns = new Map(mockContext.columns);
    columns.set('unsupportedField', {
      name: 'unsupportedField',
      type: 'unsupported',
      userDefined: false,
    });
    expectErrors(
      'FROM index | FILLNULL DEFAULT ON unsupportedField',
      [],
      { ...mockContext, columns },
      'fillnull',
      validate
    );
  });

  it.each(['DEFAULT', 'NULL', '"missing"'])(
    'rejects an explicitly targeted mapping conflict with fill value %s',
    async (value) => {
      const { validate: validateQuery, callbacks } = await setup();
      const { errors, warnings } = await validateQuery(
        `FROM index | FILLNULL ${value} ON client_ip`,
        {
          ...callbacks,
          getColumnsFor: async () => [
            {
              name: 'client_ip',
              type: 'unsupported',
              userDefined: false,
              hasConflict: true,
              originalTypes: ['ip', 'keyword'],
            },
          ],
        }
      );

      expect(errors).toEqual([
        expect.objectContaining({
          text: 'Column [client_ip] has conflicting types across indices: [ip], [keyword]',
        }),
      ]);
      expect(warnings).toEqual([]);
    }
  );

  it.each(['FILLNULL', 'FILLNULL DEFAULT', 'FILLNULL 0 ON', 'FILLNULL 0 ON doubleField,'])(
    'reports incomplete syntax for %s',
    async (command) => {
      const { validate: validateQuery } = await setup();
      const { errors } = await validateQuery(`FROM index | ${command}`);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('SyntaxError:') }),
        ])
      );
    }
  );

  it('keeps the input fields available to subsequent commands', async () => {
    const { expectErrors: expectQueryErrors } = await setup();
    await expectQueryErrors(
      'ROW count = 1, label = "hello" | FILLNULL DEFAULT ON * | WHERE count > 0 | KEEP label',
      []
    );
  });
});
