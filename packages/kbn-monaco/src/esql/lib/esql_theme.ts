/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { euiThemeVars, darkMode } from '@kbn/ui-theme';
import { themeRuleGroupBuilderFactory } from '../../common/theme';
import { ESQL_TOKEN_POSTFIX } from './constants';
import { monaco } from '../../monaco_imports';

const buildRuleGroup = themeRuleGroupBuilderFactory(ESQL_TOKEN_POSTFIX);

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
        'metadata',
        'mv_expand',
        'stats',
        'dissect',
        'grok',
        'project',
        'keep',
        'rename',
        'drop',
        'eval',
        'sort',
        'by',
        'where',
        'not',
        'is',
        'like',
        'rlike',
        'in',
        'as',
        'expr_ws',
        'row',
        'show',
        'meta',
        'limit',
        'nulls_ordering_direction',
        'nulls_ordering',
        'null',
        'enrich',
        'on',
        'with',
      ],
      euiThemeVars.euiColorPrimaryText
    ),

    // functions
    ...buildRuleGroup(['functions'], euiThemeVars.euiColorPrimaryText),

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
