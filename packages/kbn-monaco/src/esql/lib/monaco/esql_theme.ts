/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { euiThemeVars, darkMode } from '@kbn/ui-theme';
import { ESQL_TOKEN_POSTFIX } from '../constants';
import { monaco } from '../../../monaco_imports';

const buildRuleGroup = (tokens: string[], color: string, isBold: boolean = false) =>
  tokens.map((i) => ({
    token: i + ESQL_TOKEN_POSTFIX,
    foreground: color,
    fontStyle: isBold ? 'bold' : '',
  }));

export const buildESQlTheme = (): monaco.editor.IStandaloneThemeData => ({
  base: darkMode ? 'vs-dark' : 'vs',
  inherit: true,
  rules: [
    // base
    ...buildRuleGroup(
      [
        'explain',
        'row',
        'limit',
        'project',
        'ws',
        'assign',
        'comma',
        'dot',
        'first',
        'last',
        'opening_bracket',
        'closing_bracket',
        'quoted_identifier',
        'src_ws',
        'unquoted_identifier',
        'pipe',
        'not',
        'percent',
        'integer_literal',
        'decimal_literal',
        'src_unquoted_identifier',
        'src_quoted_identifier',
        'string',
      ],
      euiThemeVars.euiTextColor
    ),

    // commands
    ...buildRuleGroup(
      [
        'from',
        'stats',
        'eval',
        'sort',
        'by',
        'where',
        'expr_ws',
        'row',
        'limit',
        'nulls_ordering_direction',
        'nulls_ordering',
        'null',
        'boolean_value',
        'comparison_operator',
      ],
      euiThemeVars.euiColorPrimaryText
    ),

    // math functions
    ...buildRuleGroup(['unary_function'], euiThemeVars.euiColorPrimaryText),

    // operators
    ...buildRuleGroup(
      ['or', 'and', 'rp', 'lp', 'plus', 'minus', 'asterisk', 'slash'],
      euiThemeVars.euiTextSubduedColor
    ),

    // comments
    ...buildRuleGroup(
      [
        'line_comment',
        'multiline_comment',
        'expr_line_comment',
        'expr_multiline_comment',
        'src_line_comment',
        'src_multiline_comment',
      ],
      euiThemeVars.euiColorMediumShade
    ),
  ],
  colors: {},
});
