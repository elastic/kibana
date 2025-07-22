/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/validation';
import { timeUnits } from '../../../definitions/constants';
import { capitalize } from 'lodash';

const evalExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'eval', validate);
};

describe('EVAL Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    evalExpectErrors('from a_index | eval textField ', []);
    evalExpectErrors('from a_index | eval col0 = textField', []);
    evalExpectErrors('from a_index | eval doubleField + 1', []);
    evalExpectErrors('from a_index | eval textField + 1', [
      'Argument of [+] must be [double], found value [textField] type [text]',
    ]);
    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(doubleField) ', []);

    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(textField) ', [
      'Argument of [round] must be [double], found value [textField] type [text]',
    ]);
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(doubleField), doubleField  ',
      []
    );
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(doubleField), var0 = doubleField  ',
      []
    );

    evalExpectErrors('from a_index | eval col0=[1, 2, 3]', []);
    evalExpectErrors('from a_index | eval col0=[true, false]', []);
    evalExpectErrors('from a_index | eval col0=["a", "b"]', []);
    evalExpectErrors('from a_index | eval col0=null', []);
  });
  test('date_diff', () => {
    evalExpectErrors(
      'from a_index | eval date_diff(textField, "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
      []
    );
    evalExpectErrors(
      'from a_index | eval date_diff("month", dateField, "2023-12-02T11:00:00.000Z")',
      []
    );
    evalExpectErrors(
      'from a_index | eval date_diff("month", "2023-12-02T11:00:00.000Z", dateField)',
      []
    );
    evalExpectErrors('from a_index | eval date_diff("month", textField, dateField)', [
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
    evalExpectErrors('from a_index | eval date_diff("month", dateField, textField)', [
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
    evalExpectErrors(
      'from a_index | eval var0 = date_diff("year", to_datetime(textField), to_datetime(textField))',
      []
    );
    evalExpectErrors('from a_index | eval date_diff(doubleField, textField, textField)', [
      'Argument of [date_diff] must be [keyword], found value [doubleField] type [double]',
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
  });
  test('raises error on unknown field', () => {
    evalExpectErrors('from a_index | eval col0=b', ['Unknown column [b]']);
    evalExpectErrors('from a_index | eval col0=round', ['Unknown column [round]']);
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(textField), doubleField  ',
      ['Argument of [round] must be [double], found value [textField] type [text]']
    );
  });
  test('validates IS NULL', () => {
    evalExpectErrors(`from a_index | eval doubleField IS NULL`, []);
    evalExpectErrors(`from a_index | eval doubleField IS NOT NULL`, []);
  });
  test('validates nesting', () => {
    const NESTING_LEVELS = 4;
    const NESTED_DEPTHS = Array(NESTING_LEVELS)
      .fill(0)
      .map((_, i) => i + 1);
    for (const nesting of NESTED_DEPTHS) {
      for (const evenOp of ['-', '+']) {
        for (const oddOp of ['-', '+']) {
          // This builds a combination of +/- operators
          // i.e. ---- something, -+-+ something, +-+- something, etc...
          const unaryCombination = Array(nesting)
            .fill('- ')
            .map((_, i) => (i % 2 ? oddOp : evenOp))
            .join('');
          evalExpectErrors(`from a_index | eval ${unaryCombination} doubleField`, []);
          evalExpectErrors(`from a_index | eval col0=${unaryCombination} doubleField`, []);
          evalExpectErrors(`from a_index | eval col0=${unaryCombination} round(doubleField)`, []);
          evalExpectErrors(`from a_index | eval 1 + ${unaryCombination} doubleField`, []);
          // still valid
          evalExpectErrors(`from a_index | eval 1 ${unaryCombination} doubleField`, []);
        }
      }

      evalExpectErrors(
        `from a_index | eval ${Array(nesting).fill('not ').join('')} booleanField`,
        []
      );
    }
  });

  test('warnings when log is used', () => {
    evalExpectErrors('from a_index | eval log10(-1)', [
      'Log of a negative number results in null: -1',
    ]);
    evalExpectErrors('from a_index | eval log(-1)', [
      'Log of a negative number results in null: -1',
    ]);
    evalExpectErrors('from a_index | eval log(-1, 20)', [
      'Log of a negative number results in null: -1',
    ]);
    evalExpectErrors('from a_index | eval log(-1, -20)', [
      'Log of a negative number results in null: -1',
      'Log of a negative number results in null: -20',
    ]);
    evalExpectErrors('from a_index | eval col0 = log(-1, -20)', [
      'Log of a negative number results in null: -1',
      'Log of a negative number results in null: -20',
    ]);
  });

  test('validates operators', () => {
    for (const op of ['>', '>=', '<', '<=', '==', '!=']) {
      evalExpectErrors(`from a_index | eval doubleField ${op} 0`, []);
      evalExpectErrors(`from a_index | eval NOT doubleField ${op} 0`, []);
      evalExpectErrors(`from a_index | eval (doubleField ${op} 0)`, []);
      evalExpectErrors(`from a_index | eval (NOT (doubleField ${op} 0))`, []);
      evalExpectErrors(`from a_index | eval 1 ${op} 0`, []);
      for (const type of ['text', 'double', 'date', 'boolean', 'ip']) {
        if (type === 'boolean') {
          evalExpectErrors(
            `from a_index | eval ${type}Field ${op} ${type}Field`,
            type !== 'boolean' || ['==', '!='].includes(op)
              ? []
              : [
                  `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                  `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                ]
          );
        } else {
          evalExpectErrors(
            `from a_index | eval ${type}Field ${op} ${type}Field`,
            type !== 'boolean' || ['==', '!='].includes(op)
              ? []
              : [
                  `Argument of [${op}] must be [double], found value [${type}Field] type [${type}]`,
                  `Argument of [${op}] must be [double], found value [${type}Field] type [${type}]`,
                ]
          );
        }
      }
      // Implicit casting of literal values tests
      evalExpectErrors(`from a_index | eval doubleField ${op} textField`, [
        `Argument of [${op}] must be [double], found value [textField] type [text]`,
      ]);
      evalExpectErrors(`from a_index | eval keywordField ${op} doubleField`, [
        `Argument of [${op}] must be [double], found value [keywordField] type [keyword]`,
      ]);
      evalExpectErrors(`from a_index | eval doubleField ${op} "2022"`, [
        op === '==' || op === '!='
          ? `Argument of [${op}] must be [boolean], found value [doubleField] type [double]`
          : `Argument of [${op}] must be [date], found value [doubleField] type [double]`,
      ]);

      evalExpectErrors(`from a_index | eval dateField ${op} keywordField`, [
        `Argument of [${op}] must be [date], found value [keywordField] type [keyword]`,
      ]);
      evalExpectErrors(`from a_index | eval keywordField ${op} dateField`, [
        `Argument of [${op}] must be [date], found value [keywordField] type [keyword]`,
      ]);

      // Check that the implicit cast doesn't apply for fields
      evalExpectErrors(`from a_index | eval textField ${op} 0`, [
        `Argument of [${op}] must be [double], found value [textField] type [text]`,
      ]);
      evalExpectErrors(`from a_index | eval textField ${op} now()`, [
        `Argument of [${op}] must be [date], found value [textField] type [text]`,
      ]);

      evalExpectErrors(`from a_index | eval dateField ${op} "2022"`, []);
      evalExpectErrors(`from a_index | eval "2022" ${op} dateField`, []);

      evalExpectErrors(`from a_index | eval versionField ${op} "1.2.3"`, []);
      evalExpectErrors(`from a_index | eval "1.2.3" ${op} versionField`, []);

      evalExpectErrors(
        `from a_index | eval booleanField ${op} "true"`,
        ['==', '!='].includes(op)
          ? []
          : [`Argument of [${op}] must be [date], found value [booleanField] type [boolean]`]
      );
      evalExpectErrors(
        `from a_index | eval "true" ${op} booleanField`,
        ['==', '!='].includes(op)
          ? []
          : [`Argument of [${op}] must be [date], found value [booleanField] type [boolean]`]
      );

      evalExpectErrors(`from a_index | eval ipField ${op} "136.36.3.205"`, []);
      evalExpectErrors(`from a_index | eval "136.36.3.205" ${op} ipField`, []);
    }
    // casting for IN for version, date, boolean, ip
    evalExpectErrors(
      'from a_index | eval versionField in ("1.2.3", "4.5.6", to_version("2.3.2"))',
      []
    );
    evalExpectErrors(
      'from a_index | eval dateField in ("2023-12-12", "2024-12-12", date_parse("yyyy-MM-dd", "2025-12-12"))',
      []
    );
    evalExpectErrors('from a_index | eval booleanField in ("true", "false", false)', []);
    evalExpectErrors(
      'from a_index | eval ipField in ("136.36.3.205", "136.36.3.206", to_ip("136.36.3.207"))',
      []
    );

    for (const op of ['+', '-', '*', '/', '%']) {
      evalExpectErrors(`from a_index | eval doubleField ${op} 1`, []);
      evalExpectErrors(`from a_index | eval (doubleField ${op} 1)`, []);
      evalExpectErrors(`from a_index | eval 1 ${op} 1`, []);
      evalExpectErrors(
        `from a_index | eval now() ${op} now()`,
        ['+', '-'].includes(op)
          ? [`Argument of [${op}] must be [date_period], found value [now()] type [date]`]
          : [
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
            ]
      );

      evalExpectErrors(
        `from a_index | eval 1 ${op} "1"`,
        ['+', '-'].includes(op)
          ? [`Argument of [${op}] must be [date], found value [1] type [integer]`]
          : [`Argument of [${op}] must be [double], found value [\"1\"] type [keyword]`]
      );
      evalExpectErrors(
        `from a_index | eval "1" ${op} 1`,
        ['+', '-'].includes(op)
          ? [`Argument of [${op}] must be [date_period], found value [1] type [integer]`]
          : [`Argument of [${op}] must be [double], found value [\"1\"] type [keyword]`]
      );
      // TODO: enable when https://github.com/elastic/elasticsearch/issues/108432 is complete
      // evalExpectErrors(`from a_index | eval "2022" ${op} 1 day`, []);
    }
    for (const divideByZeroExpr of ['1/0', 'col0 = 1/0', '1 + 1/0']) {
      evalExpectErrors(`from a_index | eval ${divideByZeroExpr}`, ['Cannot divide by zero: 1/0']);
    }
    for (const divideByZeroExpr of ['1%0', 'col0 = 1%0', '1 + 1%0']) {
      evalExpectErrors(`from a_index | eval ${divideByZeroExpr}`, [
        'Module by zero can return null value: 1%0',
      ]);
    }
    for (const op of ['like', 'rlike']) {
      evalExpectErrors(`from a_index | eval textField ${op} "?a"`, []);
      evalExpectErrors(`from a_index | eval textField NOT ${op} "?a"`, []);
      evalExpectErrors(`from a_index | eval NOT textField ${op} "?a"`, []);
      evalExpectErrors(`from a_index | eval NOT textField NOT ${op} "?a"`, []);
      evalExpectErrors(`from a_index | eval doubleField ${op} "?a"`, [
        `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
      ]);
      evalExpectErrors(`from a_index | eval doubleField NOT ${op} "?a"`, [
        `Argument of [not ${op}] must be [keyword], found value [doubleField] type [double]`,
      ]);
      evalExpectErrors(`from a_index | eval NOT doubleField ${op} "?a"`, [
        `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
      ]);
      evalExpectErrors(`from a_index | eval NOT doubleField NOT ${op} "?a"`, [
        `Argument of [not ${op}] must be [keyword], found value [doubleField] type [double]`,
      ]);
    }

    // test lists
    evalExpectErrors('from a_index | eval 1 in (1, 2, 3)', []);
    evalExpectErrors('from a_index | eval doubleField in (1, 2, 3)', []);
    evalExpectErrors('from a_index | eval doubleField not in (1, 2, 3)', []);
    evalExpectErrors('from a_index | eval doubleField not in (1, 2, 3, doubleField)', []);
    evalExpectErrors('from a_index | eval 1 in (1, 2, 3, round(doubleField))', []);
    evalExpectErrors('from a_index | eval "a" in ("a", "b", "c")', []);
    evalExpectErrors('from a_index | eval textField in ("a", "b", "c")', []);
    evalExpectErrors('from a_index | eval textField not in ("a", "b", "c")', []);
    evalExpectErrors('from a_index | eval textField not in ("a", "b", "c", textField)', []);
    evalExpectErrors('from a_index | eval 1 in ("a", "b", "c")', [
      'Argument of [in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
    ]);
    evalExpectErrors('from a_index | eval doubleField in ("a", "b", "c")', [
      // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    evalExpectErrors('from a_index | eval doubleField not in ("a", "b", "c")', [
      // 'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    evalExpectErrors('from a_index | eval doubleField not in (1, 2, 3, textField)', [
      // 'Argument of [not_in] must be [number[]], found value [(1, 2, 3, textField)] type [(number, number, number, string)]',
    ]);
  });

  test('rest validations', () => {
    const newUserDefinedColumns = new Map(mockContext.userDefinedColumns);
    newUserDefinedColumns.set('avg(doubleField)', [
      {
        name: 'avg(doubleField)',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    const context = {
      ...mockContext,
      userDefinedColumns: newUserDefinedColumns,
    };
    evalExpectErrors('from a_index | eval avg(doubleField)', [
      'EVAL does not support function avg',
    ]);
    evalExpectErrors(
      'from a_index | stats avg(doubleField) | eval `avg(doubleField)` + 1',
      [],
      context
    );
    evalExpectErrors('from a_index | eval not', [
      'Error: [not] function expects exactly one argument, got 0.',
    ]);

    evalExpectErrors('from a_index | eval mv_sort(["a", "b"], "bogus")', [
      'Invalid option ["bogus"] for mv_sort. Supported options: ["asc", "desc"].',
    ]);

    evalExpectErrors(`from a_index | eval mv_sort(["a", "b"], "ASC")`, []);
    evalExpectErrors(`from a_index | eval mv_sort(["a", "b"], "DESC")`, []);

    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1), round(col0)`, []);
    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1) | stats sum(col0)`, []);
    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1) | stats col0 = sum(col0)`, []);
    evalExpectErrors(`from a_index | eval round(case(false, 0, 1))`, []);
  });

  test('date math', () => {
    evalExpectErrors('from a_index | eval 1 anno', [
      'EVAL does not support [date_period] in expression [1 anno]',
    ]);
    evalExpectErrors('from a_index | eval col0 = 1 anno', [
      "Unexpected time interval qualifier: 'anno'",
    ]);
    evalExpectErrors('from a_index | eval now() + 1 anno', [
      "Unexpected time interval qualifier: 'anno'",
    ]);
    for (const unit of timeUnits) {
      evalExpectErrors(`from a_index | eval 1 ${unit}`, [
        `EVAL does not support [date_period] in expression [1 ${unit}]`,
      ]);
      evalExpectErrors(`from a_index | eval 1                ${unit}`, [
        `EVAL does not support [date_period] in expression [1 ${unit}]`,
      ]);

      // this is not possible for now
      // evalExpectErrors(`from a_index | eval col0 = 1 ${timeLiteral.name}`, [
      //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      // ]);
      evalExpectErrors(`from a_index | eval col0 = now() - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit.toUpperCase()}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${capitalize(unit)}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField + 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval 1 ${unit} + 1 year`, []);
      for (const op of ['*', '/', '%']) {
        evalExpectErrors(`from a_index | eval col0 = now() ${op} 1 ${unit}`, [
          `Argument of [${op}] must be [double], found value [now()] type [date]`,
          `Argument of [${op}] must be [double], found value [1 ${unit}] type [duration]`,
        ]);
      }
    }
  });
});
