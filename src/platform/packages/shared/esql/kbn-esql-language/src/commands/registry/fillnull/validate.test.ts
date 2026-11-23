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
  describe('unmapped targets', () => {
    it.each(['load', 'load_all', 'nullify'])(
      'accepts patterns matching exact targets in the same ON list under %s',
      async (strategy) => {
        const { validate: validateQuery } = await setup();
        for (const targets of ['extra_*, extra_name', 'extra_name, extra_*']) {
          const { errors } = await validateQuery(
            `SET unmapped_fields="${strategy}"; FROM index | FILLNULL "x" ON ${targets}`
          );
          expect(errors).toEqual([]);
        }
      }
    );

    it('still rejects a pattern when the exact target does not match', async () => {
      const { validate: validateQuery } = await setup();
      const { errors } = await validateQuery(
        'SET unmapped_fields="load"; FROM index | FILLNULL "x" ON extra_*, another_name'
      );
      expect(errors).toEqual([expect.objectContaining({ text: 'Unknown column "extra_*"' })]);
    });

    it('does not use same-list targets to load fields under the default strategy', async () => {
      const { validate: validateQuery } = await setup();
      const { errors } = await validateQuery('FROM index | FILLNULL "x" ON extra_*, extra_name');
      expect(errors).toEqual([
        expect.objectContaining({ text: 'Unknown column "extra_*"' }),
        expect.objectContaining({ text: 'Unknown column "extra_name"' }),
      ]);
    });

    it.each(['load', 'nullify'])('accepts a field retained by KEEP under %s', async (strategy) => {
      const { validate: validateQuery } = await setup();
      const { errors, warnings } = await validateQuery(
        `SET unmapped_fields="${strategy}"; FROM index | KEEP custom.field | FILLNULL "n/a" ON custom.field`
      );
      expect(errors).toEqual([]);
      expect(warnings).toHaveLength(2);
      expect(warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('"custom.field" column isn\'t mapped'),
          }),
        ])
      );
    });

    it.each([
      'KEEP custom.field | FILLNULL "n/a" ON another.field',
      'KEEP custom.field, keywordField | DROP custom.field | FILLNULL "n/a" ON custom.field',
    ])('still rejects a field absent from the input after %s', async (pipeline) => {
      const { validate: validateQuery } = await setup();
      const { errors } = await validateQuery(
        `SET unmapped_fields="load"; FROM index | ${pipeline}`
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(
        expect.objectContaining({ text: expect.stringContaining('Unknown column') })
      );
    });

    it.each(['load', 'load_all', 'nullify'])(
      'rejects an unmatched pattern under %s',
      async (strategy) => {
        const { validate: validateQuery } = await setup();
        const { errors, warnings } = await validateQuery(
          `SET unmapped_fields="${strategy}"; FROM index | FILLNULL DEFAULT ON missing_*`
        );
        expect(errors).toEqual([expect.objectContaining({ text: 'Unknown column "missing_*"' })]);
        expect(warnings).toEqual([]);
      }
    );

    it.each(['missing_name', '`missing_*`'])(
      'keeps the warning for the literal name %s',
      async (field) => {
        const { validate: validateQuery } = await setup();
        const { errors, warnings } = await validateQuery(
          `SET unmapped_fields="load"; FROM index | FILLNULL DEFAULT ON ${field}`
        );
        expect(errors).toEqual([]);
        expect(warnings).toEqual([
          expect.objectContaining({ text: expect.stringContaining("isn't mapped") }),
        ]);
      }
    );

    it('accepts a pattern matching input columns', async () => {
      const { expectErrors: expectQueryErrors } = await setup();
      await expectQueryErrors(
        'SET unmapped_fields="load"; FROM index | FILLNULL DEFAULT ON keyword*',
        []
      );
    });

    it('does not reject a pattern that can match a field loaded by a later reference', async () => {
      const { validate: validateQuery } = await setup();
      const { errors } = await validateQuery(
        'SET unmapped_fields="load"; FROM index | FILLNULL DEFAULT ON missing_* | WHERE missing_name IS NOT NULL'
      );
      expect(errors).toEqual([]);
    });
  });

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
        `FROM conflict_index | FILLNULL ${value} ON client_ip`,
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
