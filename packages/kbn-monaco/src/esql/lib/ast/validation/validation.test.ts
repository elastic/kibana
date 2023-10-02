/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANTLREErrorListener } from '../../../../common/error_listener';
import { CharStreams } from 'antlr4ts';
import { getParser, ROOT_STATEMENT } from '../../antlr_facade';
// import { mathCommandDefinition } from '../../autocomplete/autocomplete_definitions';
// import { getDurationItemsWithQuantifier } from '../../autocomplete/helpers';
import { AstListener } from '../ast_factory';
import { validateAst } from './validation';

describe('validation logic', () => {
  const getAst = (text: string) => {
    const errorListener = new ANTLREErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return parseListener.getAst();
  };

  function testErrorsAndWarnings(
    statement: string,
    expectedErrors: string[] = [],
    expectedWarnings: string[] = []
  ) {
    it(`${statement} => ${expectedErrors.length} errors, ${expectedWarnings.length} warnings`, async () => {
      const { ast } = getAst(statement);
      const { warnings, errors } = validateAst(ast);
      const finalErrors = errors;
      expect(finalErrors.map((e) => e.text)).toEqual(expectedErrors);
      expect(warnings.map((w) => w.text)).toEqual(expectedWarnings);
    });
  }

  describe('from', () => {
    testErrorsAndWarnings('f', ['SyntaxError: expected {FROM, ROW, SHOW} but found "f"']);
    testErrorsAndWarnings('from ', [
      'missing {SRC_UNQUOTED_IDENTIFIER, SRC_QUOTED_IDENTIFIER} at "< EOF >"',
    ]);
    testErrorsAndWarnings('from a,', [
      'missing {SRC_UNQUOTED_IDENTIFIER, SRC_QUOTED_IDENTIFIER} at "< EOF >"',
    ]);
    testErrorsAndWarnings('from a, b ', []);
    testErrorsAndWarnings('from a, missing_index', [
      'index_not_found_exception - no such index [missing_index]',
    ]);
  });

  describe('row', () => {
    testErrorsAndWarnings('row', [
      "SyntaxError: mismatched input '<EOF>' expecting {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
    ]);
    testErrorsAndWarnings('row missing_column', ['Unknown column [missing_column]']);
    testErrorsAndWarnings('row missing_column, missing_column2', [
      'Unknown column [missing_column]',
      'Unknown column [missing_column2]',
    ]);
    testErrorsAndWarnings('row a=1', []);
    testErrorsAndWarnings('row a=1, missing_column', ['Unknown column [missing_column]']);
  });

  //   describe('where', () => {
  //     testErrorsAndWarnings('from a | where ', ['cidr_match', 'FieldIdentifier']);
  //     testErrorsAndWarnings('from a | where "field" ', [
  //       '==',
  //       '!=',
  //       '<',
  //       '>',
  //       '<=',
  //       '>=',
  //       'like',
  //       'rlike',
  //       'in',
  //     ]);
  //     testErrorsAndWarnings('from a | where "field" >= ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | where "field" >= "field1" ', ['or', 'and', '|']);
  //     testErrorsAndWarnings('from a | where "field" >= "field1" and ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | where "field" >= "field1" and  "field2" ', [
  //       '==',
  //       '!=',
  //       '<',
  //       '>',
  //       '<=',
  //       '>=',
  //       'like',
  //       'rlike',
  //       'in',
  //     ]);
  //     testErrorsAndWarnings('from a | stats a=avg("field") | where a ', [
  //       '==',
  //       '!=',
  //       '<',
  //       '>',
  //       '<=',
  //       '>=',
  //       'like',
  //       'rlike',
  //       'in',
  //     ]);
  //     testErrorsAndWarnings('from a | stats a=avg("b") | where "c" ', [
  //       '==',
  //       '!=',
  //       '<',
  //       '>',
  //       '<=',
  //       '>=',
  //       'like',
  //       'rlike',
  //       'in',
  //     ]);
  //     testErrorsAndWarnings('from a | where "field" >= "field1" and  "field2 == ', ['FieldIdentifier']);
  //   });

  //   describe('sort', () => {
  //     testErrorsAndWarnings('from a | sort ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | sort "field" ', ['asc', 'desc']);
  //     testErrorsAndWarnings('from a | sort "field" desc ', ['nulls']);
  //     testErrorsAndWarnings('from a | sort "field" desc nulls ', ['first', 'last']);
  //   });

  //   describe('limit', () => {
  //     testErrorsAndWarnings('from a | limit ', ['1000']);
  //     testErrorsAndWarnings('from a | limit 4 ', ['|']);
  //   });

  //   describe('mv_expand', () => {
  //     testErrorsAndWarnings('from a | mv_expand ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | mv_expand a ', ['|']);
  //   });

  //   describe('stats', () => {
  //     testErrorsAndWarnings('from a | stats ', ['var0']);
  //     testErrorsAndWarnings('from a | stats a ', ['=']);
  //     testErrorsAndWarnings('from a | stats a=', [
  //       'avg',
  //       'max',
  //       'min',
  //       'sum',
  //       'count',
  //       'count_distinct',
  //       'median',
  //       'median_absolute_deviation',
  //       'percentile',
  //     ]);
  //     testErrorsAndWarnings('from a | stats a=b by ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | stats a=c by d', ['|']);
  //     testErrorsAndWarnings('from a | stats a=b, ', ['var0']);
  //     testErrorsAndWarnings('from a | stats a=max', ['(']);
  //     testErrorsAndWarnings('from a | stats a=min(', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | stats a=min(b', [')', 'FieldIdentifier']);
  //     testErrorsAndWarnings('from a | stats a=min(b) ', ['|', 'by']);
  //     testErrorsAndWarnings('from a | stats a=min(b) by ', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | stats a=min(b),', ['var0']);
  //     testErrorsAndWarnings('from a | stats var0=min(b),var1=c,', ['var2']);
  //     testErrorsAndWarnings('from a | stats a=min(b), b=max(', ['FieldIdentifier']);
  //   });

  //   describe('enrich', () => {
  //     for (const prevCommand of [
  //       '',
  //       '| enrich other-policy ',
  //       '| enrich other-policy on b ',
  //       '| enrich other-policy with c ',
  //     ]) {
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich`, ['PolicyIdentifier']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy `, ['|', 'on', 'with']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on `, [
  //         'PolicyMatchingFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b `, ['|', 'with']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with `, [
  //         'var0',
  //         'PolicyFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 `, ['=', '|']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 = `, [
  //         'PolicyFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 = c `, ['|']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 = c, `, [
  //         'var1',
  //         'PolicyFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 `, ['=', '|']);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 = `, [
  //         'PolicyFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy with `, [
  //         'var0',
  //         'PolicyFieldIdentifier',
  //       ]);
  //       testErrorsAndWarnings(`from a ${prevCommand}| enrich policy with c`, ['=', '|']);
  //     }
  //   });

  //   describe('eval', () => {
  //     const functionSuggestions = mathCommandDefinition.map(({ label }) => String(label));

  //     testErrorsAndWarnings('from a | eval ', ['var0']);
  //     testErrorsAndWarnings('from a | eval a ', ['=']);
  //     testErrorsAndWarnings('from a | eval a=', functionSuggestions);
  //     testErrorsAndWarnings('from a | eval a=b, ', ['var0']);
  //     testErrorsAndWarnings('from a | eval a=round', ['(']);
  //     testErrorsAndWarnings('from a | eval a=round(', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | eval a=round(b) ', ['|', '+', '-', '/', '*']);
  //     testErrorsAndWarnings('from a | eval a=round(b),', ['var0']);
  //     testErrorsAndWarnings('from a | eval a=round(b) + ', ['FieldIdentifier', ...functionSuggestions]);
  //     // NOTE: this is handled also partially in the suggestion wrapper with auto-injection of closing brackets
  //     testErrorsAndWarnings('from a | eval a=round(b', [')', 'FieldIdentifier']);
  //     testErrorsAndWarnings('from a | eval a=round(b), b=round(', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | stats a=round(b), b=round(', ['FieldIdentifier']);
  //     testErrorsAndWarnings('from a | eval var0=round(b), var1=round(c) | stats ', ['var2']);

  //     describe('date math', () => {
  //       const dateSuggestions = [
  //         'year',
  //         'month',
  //         'week',
  //         'day',
  //         'hour',
  //         'minute',
  //         'second',
  //         'millisecond',
  //       ].flatMap((v) => [v, `${v}s`]);
  //       const dateMathSymbols = ['+', '-'];
  //       testErrorsAndWarnings('from a | eval a = 1 ', dateMathSymbols.concat(dateSuggestions, ['|']));
  //       testErrorsAndWarnings('from a | eval a = 1 year ', dateMathSymbols.concat(dateSuggestions, ['|']));
  //       testErrorsAndWarnings(
  //         'from a | eval a = 1 day + 2 ',
  //         dateMathSymbols.concat(dateSuggestions, ['|'])
  //       );
  //       testErrorsAndWarnings(
  //         'from a | eval var0=date_trunc(',
  //         ['FieldIdentifier'].concat(...getDurationItemsWithQuantifier().map(({ label }) => label))
  //       );
  //       testErrorsAndWarnings(
  //         'from a | eval var0=date_trunc(2 ',
  //         [')', 'FieldIdentifier'].concat(dateSuggestions)
  //       );
  //     });
});
