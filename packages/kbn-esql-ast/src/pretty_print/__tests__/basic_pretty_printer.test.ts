/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../../ast_parser';
import { ESQLFunction } from '../../types';
import { Walker } from '../../walker';
import { BasicPrettyPrinter, BasicPrettyPrinterMultilineOptions } from '../basic_pretty_printer';

const reprint = (src: string) => {
  const { ast } = getAstAndSyntaxErrors(src);
  const text = BasicPrettyPrinter.print(ast);

  // console.log(JSON.stringify(ast, null, 2));

  return { text };
};

describe('single line query', () => {
  describe('commands', () => {
    describe('FROM', () => {
      test('FROM command with a single source', () => {
        const { text } = reprint('FROM index1');

        expect(text).toBe('FROM index1');
      });

      test('FROM command with multiple indices', () => {
        const { text } = reprint('from index1, index2, index3');

        expect(text).toBe('FROM index1, index2, index3');
      });

      test('FROM command with METADATA', () => {
        const { text } = reprint('FROM index1, index2 METADATA field1, field2');

        expect(text).toBe('FROM index1, index2 METADATA field1, field2');
      });
    });

    describe('SORT', () => {
      test('order expression with no modifier', () => {
        const { text } = reprint('FROM a | SORT b');

        expect(text).toBe('FROM a | SORT b');
      });

      /** @todo Enable once order expressions are supported.  */
      test.skip('order expression with ASC modifier', () => {
        const { text } = reprint('FROM a | SORT b ASC');

        expect(text).toBe('FROM a | SORT b ASC');
      });

      /** @todo Enable once order expressions are supported.  */
      test.skip('order expression with ASC and NULLS FIRST modifier', () => {
        const { text } = reprint('FROM a | SORT b ASC NULLS FIRST');

        expect(text).toBe('FROM a | SORT b ASC NULLS FIRST');
      });
    });

    describe('EXPLAIN', () => {
      /** @todo Enable once query expressions are supported.  */
      test.skip('a nested query', () => {
        const { text } = reprint('EXPLAIN [ FROM 1 ]');

        expect(text).toBe('EXPLAIN [ FROM 1 ]');
      });
    });

    describe('SHOW', () => {
      /** @todo Enable once show command args are parsed as columns.  */
      test.skip('info page', () => {
        const { text } = reprint('SHOW info');

        expect(text).toBe('SHOW info');
      });
    });

    describe('META', () => {
      /** @todo Enable once show command args are parsed as columns.  */
      test.skip('functions page', () => {
        const { text } = reprint('META functions');

        expect(text).toBe('META functions');
      });
    });

    describe('STATS', () => {
      test('with aggregates assignment', () => {
        const { text } = reprint('FROM a | STATS var = agg(123, fn(true))');

        expect(text).toBe('FROM a | STATS var = AGG(123, FN(TRUE))');
      });

      test('with BY clause', () => {
        const { text } = reprint('FROM a | STATS a(1), b(2) by asdf');

        expect(text).toBe('FROM a | STATS A(1), B(2) BY asdf');
      });
    });
  });

  describe('expressions', () => {
    describe('source expressions', () => {
      test('simple source expression', () => {
        const { text } = reprint('from source');

        expect(text).toBe('FROM source');
      });

      test('sources with dots', () => {
        const { text } = reprint('FROM a.b.c');

        expect(text).toBe('FROM a.b.c');
      });

      test('sources with slashes', () => {
        const { text } = reprint('FROM a/b/c');

        expect(text).toBe('FROM a/b/c');
      });

      test('cluster source', () => {
        const { text } = reprint('FROM cluster:index');

        expect(text).toBe('FROM cluster:index');
      });

      test('quoted source', () => {
        const { text } = reprint('FROM "quoted"');

        expect(text).toBe('FROM quoted');
      });

      test('triple-quoted source', () => {
        const { text } = reprint('FROM """quoted"""');

        expect(text).toBe('FROM quoted');
      });
    });

    describe('column expressions', () => {
      test('simple columns expressions', () => {
        const { text } = reprint('FROM a METADATA column1, _column2');

        expect(text).toBe('FROM a METADATA column1, _column2');
      });

      // Un-skip when columns are parsed correctly: https://github.com/elastic/kibana/issues/189913
      test.skip('nested fields', () => {
        const { text } = reprint('FROM a | KEEP a.b');

        expect(text).toBe('FROM a | KEEP a.b');
      });

      // Un-skip when columns are parsed correctly: https://github.com/elastic/kibana/issues/189913
      test.skip('quoted nested fields', () => {
        const { text } = reprint('FROM index | KEEP `a`.`b`, c.`d`');

        expect(text).toBe('FROM index | KEEP a.b, c.d');
      });

      // Un-skip when identifier names are escaped correctly.
      test.skip('special character in identifier', () => {
        const { text } = reprint('FROM a | KEEP `a 👉 b`, a.`✅`');

        expect(text).toBe('FROM a | KEEP `a 👉 b`, a.`✅`');
      });
    });

    describe('"function" expressions', () => {
      describe('function call expression', () => {
        test('no argument function', () => {
          const { text } = reprint('ROW fn()');

          expect(text).toBe('ROW FN()');
        });

        test('functions with arguments', () => {
          const { text } = reprint('ROW gg(1), wp(1, 2, 3)');

          expect(text).toBe('ROW GG(1), WP(1, 2, 3)');
        });

        test('functions with star argument', () => {
          const { text } = reprint('ROW f(*)');

          expect(text).toBe('ROW F(*)');
        });
      });

      describe('unary expression', () => {
        test('NOT expression', () => {
          const { text } = reprint('ROW NOT a');

          expect(text).toBe('ROW NOT a');
        });
      });

      describe('postfix unary expression', () => {
        test('IS NOT NULL expression', () => {
          const { text } = reprint('ROW a IS NOT NULL');

          expect(text).toBe('ROW a IS NOT NULL');
        });
      });

      describe('binary expression', () => {
        test('arithmetic expression', () => {
          const { text } = reprint('ROW 1 + 2');

          expect(text).toBe('ROW 1 + 2');
        });

        test('assignment expression', () => {
          const { text } = reprint('FROM a | STATS a != 1');

          expect(text).toBe('FROM a | STATS a != 1');
        });

        test('regex expression - 1', () => {
          const { text } = reprint('FROM a | WHERE a NOT RLIKE "a"');

          expect(text).toBe('FROM a | WHERE a NOT RLIKE "a"');
        });

        test('regex expression - 2', () => {
          const { text } = reprint('FROM a | WHERE a LIKE "b"');

          expect(text).toBe('FROM a | WHERE a LIKE "b"');
        });

        test('inserts brackets where necessary due precedence', () => {
          const { text } = reprint('FROM a | WHERE (1 + 2) * 3');

          expect(text).toBe('FROM a | WHERE (1 + 2) * 3');
        });

        test('inserts brackets where necessary due precedence - 2', () => {
          const { text } = reprint('FROM a | WHERE (1 + 2) * (3 - 4)');

          expect(text).toBe('FROM a | WHERE (1 + 2) * (3 - 4)');
        });

        test('inserts brackets where necessary due precedence - 3', () => {
          const { text } = reprint('FROM a | WHERE (1 + 2) * (3 - 4) / (5 + 6 + 7)');

          expect(text).toBe('FROM a | WHERE (1 + 2) * (3 - 4) / (5 + 6 + 7)');
        });

        test('inserts brackets where necessary due precedence - 4', () => {
          const { text } = reprint('FROM a | WHERE (1 + (1 + 2)) * ((3 - 4) / (5 + 6 + 7))');

          expect(text).toBe('FROM a | WHERE (1 + 1 + 2) * (3 - 4) / (5 + 6 + 7)');
        });

        test('inserts brackets where necessary due precedence - 5', () => {
          const { text } = reprint('FROM a | WHERE (1 + (1 + 2)) * (((3 - 4) / (5 + 6 + 7)) + 1)');

          expect(text).toBe('FROM a | WHERE (1 + 1 + 2) * ((3 - 4) / (5 + 6 + 7) + 1)');
        });
      });
    });

    describe('literals expressions', () => {
      test('null', () => {
        const { text } = reprint('ROW null');

        expect(text).toBe('ROW NULL');
      });

      test('boolean', () => {
        expect(reprint('ROW true').text).toBe('ROW TRUE');
        expect(reprint('ROW false').text).toBe('ROW FALSE');
      });

      describe('numeric literal', () => {
        test('integer', () => {
          const { text } = reprint('ROW 1');

          expect(text).toBe('ROW 1');
        });

        test('decimal', () => {
          const { text } = reprint('ROW 1.2');

          expect(text).toBe('ROW 1.2');
        });

        test('rounded decimal', () => {
          const { text } = reprint('ROW 1.0');

          expect(text).toBe('ROW 1.0');
        });

        test('string', () => {
          const { text } = reprint('ROW "abc"');

          expect(text).toBe('ROW "abc"');
        });

        test('string w/ special chars', () => {
          const { text } = reprint('ROW "as \\" 👍"');

          expect(text).toBe('ROW "as \\" 👍"');
        });
      });

      describe('params', () => {
        test('unnamed', () => {
          const { text } = reprint('ROW ?');

          expect(text).toBe('ROW ?');
        });

        test('named', () => {
          const { text } = reprint('ROW ?kappa');

          expect(text).toBe('ROW ?kappa');
        });

        test('positional', () => {
          const { text } = reprint('ROW ?42');

          expect(text).toBe('ROW ?42');
        });
      });
    });

    describe('list literal expressions', () => {
      describe('integer list', () => {
        test('one element list', () => {
          expect(reprint('ROW [1]').text).toBe('ROW [1]');
        });

        test('multiple elements', () => {
          expect(reprint('ROW [1, 2]').text).toBe('ROW [1, 2]');
          expect(reprint('ROW [1, 2, -1]').text).toBe('ROW [1, 2, -1]');
        });
      });

      describe('boolean list', () => {
        test('one element list', () => {
          expect(reprint('ROW [true]').text).toBe('ROW [TRUE]');
        });

        test('multiple elements', () => {
          expect(reprint('ROW [TRUE, false]').text).toBe('ROW [TRUE, FALSE]');
          expect(reprint('ROW [false, FALSE, false]').text).toBe('ROW [FALSE, FALSE, FALSE]');
        });
      });

      describe('string list', () => {
        test('one element list', () => {
          expect(reprint('ROW ["a"]').text).toBe('ROW ["a"]');
        });

        test('multiple elements', () => {
          expect(reprint('ROW ["a", "b"]').text).toBe('ROW ["a", "b"]');
          expect(reprint('ROW ["foo", "42", "boden"]').text).toBe('ROW ["foo", "42", "boden"]');
        });
      });
    });

    describe('cast expressions', () => {
      test('various', () => {
        expect(reprint('ROW a::string').text).toBe('ROW a::string');
        expect(reprint('ROW 123::string').text).toBe('ROW 123::string');
        expect(reprint('ROW "asdf"::number').text).toBe('ROW "asdf"::number');
      });

      test('wraps into rackets complex cast expressions', () => {
        expect(reprint('ROW (1 + 2)::string').text).toBe('ROW (1 + 2)::string');
      });

      test('does not wrap function call', () => {
        expect(reprint('ROW fn()::string').text).toBe('ROW FN()::string');
      });
    });

    describe('time interval expression', () => {
      test('days', () => {
        const { text } = reprint('ROW 1 d');

        expect(text).toBe('ROW 1d');
      });

      test('years', () => {
        const { text } = reprint('ROW 42y');

        expect(text).toBe('ROW 42y');
      });
    });
  });
});

describe('multiline query', () => {
  const multiline = (src: string, opts?: BasicPrettyPrinterMultilineOptions) => {
    const { ast } = getAstAndSyntaxErrors(src);
    const text = BasicPrettyPrinter.multiline(ast, opts);

    // console.log(JSON.stringify(ast, null, 2));

    return { text };
  };

  test('can print the query on multiple lines', () => {
    const { text } = multiline('FROM index1 | SORT asdf | WHERE a == 1 | LIMIT 123');

    expect(text).toBe(`FROM index1
  | SORT asdf
  | WHERE a == 1
  | LIMIT 123`);
  });

  test('can customize tabbing before pipe', () => {
    const query = 'FROM index1 | SORT asdf | WHERE a == 1 | LIMIT 123';
    const text1 = multiline(query, { pipeTab: '' }).text;
    const text2 = multiline(query, { pipeTab: '\t' }).text;

    expect(text1).toBe(`FROM index1
| SORT asdf
| WHERE a == 1
| LIMIT 123`);

    expect(text2).toBe(`FROM index1
\t| SORT asdf
\t| WHERE a == 1
\t| LIMIT 123`);
  });

  test('large query', () => {
    const query = `FROM employees, kibana_sample_data_flights, kibana_sample_data_logs, kibana_sample_data_ecommerce
| EVAL hired = DATE_FORMAT("YYYY-MM-DD", hired, "Europe/Amsterdam")
| STATS avg_salary = AVG(salary) BY hired, languages, department, dream_salary > 100000
| EVAL avg_salary = ROUND(avg_salary)
| SORT hired, languages
| LIMIT 100`;
    const text1 = multiline(query, { pipeTab: '' }).text;

    expect(text1).toBe(query);
  });
});

describe('single line command', () => {
  test('can print an individual command', () => {
    const query = `FROM employees, kibana_sample_data_flights, kibana_sample_data_logs, kibana_sample_data_ecommerce
  | EVAL hired = DATE_FORMAT("YYYY-MM-DD", hired, "Europe/Amsterdam")
  | STATS avg_salary = AVG(salary) BY hired, languages, department, dream_salary > 100000
  | EVAL avg_salary = ROUND(avg_salary)
  | SORT hired, languages
  | LIMIT 100`;
    const { ast: commands } = getAstAndSyntaxErrors(query);
    const line1 = BasicPrettyPrinter.command(commands[0]);
    const line2 = BasicPrettyPrinter.command(commands[1]);
    const line3 = BasicPrettyPrinter.command(commands[2]);

    expect(line1).toBe(
      'FROM employees, kibana_sample_data_flights, kibana_sample_data_logs, kibana_sample_data_ecommerce'
    );
    expect(line2).toBe('EVAL hired = DATE_FORMAT("YYYY-MM-DD", hired, "Europe/Amsterdam")');
    expect(line3).toBe(
      'STATS avg_salary = AVG(salary) BY hired, languages, department, dream_salary > 100000'
    );
  });
});

describe('single line expression', () => {
  test('can print a single expression', () => {
    const query = `FROM a | STATS a != 1, avg(1, 2, 3)`;
    const { ast } = getAstAndSyntaxErrors(query);
    const comparison = Walker.match(ast, { type: 'function', name: '!=' })! as ESQLFunction;
    const func = Walker.match(ast, { type: 'function', name: 'avg' })! as ESQLFunction;

    const text1 = BasicPrettyPrinter.expression(comparison);
    const text2 = BasicPrettyPrinter.expression(func);

    expect(text1).toBe('a != 1');
    expect(text2).toBe('AVG(1, 2, 3)');
  });
});
