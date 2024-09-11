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
        'ws',
        'assign',
        'comma',
        'dot',
        'opening_bracket',
        'closing_bracket',
        'quoted_identifier',
        'unquoted_identifier',
        'pipe',
      ],
      euiThemeVars.euiTextColor
    ),

    // source commands
    ...buildRuleGroup(
      ['from', 'row', 'show'],
      euiThemeVars.euiColorPrimaryText,
      true // isBold
    ),

    // commands
    ...buildRuleGroup(
      [
        'metrics',
        'meta',
        'metadata',
        'match',
        'mv_expand',
        'stats',
        'inlinestats',
        'dissect',
        'grok',
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
        'limit',
        'lookup',
        'null',
        'enrich',
        'on',
        'with',
        'asc',
        'desc',
        'nulls_order',
      ],
      euiThemeVars.euiColorAccentText,
      true // isBold
    ),

    // functions
    ...buildRuleGroup(['functions'], euiThemeVars.euiColorPrimaryText),

    // operators
    ...buildRuleGroup(
      [
        'or',
        'and',
        'rp', // ')'
        'lp', // '('
        'eq', // '=='
        'cieq', // '=~'
        'neq', // '!='
        'lt', //  '<'
        'lte', // '<='
        'gt', //  '>'
        'gte', // '>='
        'plus', // '+'
        'minus', // '-'
        'asterisk', // '*'
        'slash', // '/'
        'percent', // '%'
        'cast_op', // '::'
      ],
      euiThemeVars.euiColorPrimaryText
    ),

    // comments
    ...buildRuleGroup(
      [
        'line_comment',
        'multiline_comment',
        'expr_line_comment',
        'expr_multiline_comment',
        'explain_line_comment',
        'explain_multiline_comment',
        'project_line_comment',
        'project_multiline_comment',
        'rename_line_comment',
        'rename_multiline_comment',
        'from_line_comment',
        'from_multiline_comment',
        'enrich_line_comment',
        'enrich_multiline_comment',
        'mvexpand_line_comment',
        'mvexpand_multiline_comment',
        'enrich_field_line_comment',
        'enrich_field_multiline_comment',
        'lookup_line_comment',
        'lookup_multiline_comment',
        'lookup_field_line_comment',
        'lookup_field_multiline_comment',
        'show_line_comment',
        'show_multiline_comment',
        'meta_line_comment',
        'meta_multiline_comment',
        'setting',
        'setting_line_comment',
        'settting_multiline_comment',
        'metrics_line_comment',
        'metrics_multiline_comment',
        'closing_metrics_line_comment',
        'closing_metrics_multiline_comment',
      ],
      euiThemeVars.euiColorDisabledText
    ),

    // values
    ...buildRuleGroup(
      [
        'quoted_string',
        'integer_literal',
        'decimal_literal',
        'named_or_positional_param',
        'param',
        'timespan_literal',
      ],
      euiThemeVars.euiColorSuccessText
    ),
  ],
  colors: {
    'editor.foreground': euiThemeVars.euiTextColor,
    'editor.background': euiThemeVars.euiColorEmptyShade,
    'editor.lineHighlightBackground': euiThemeVars.euiColorLightestShade,
    'editor.lineHighlightBorder': euiThemeVars.euiColorLightestShade,
    'editor.selectionHighlightBackground': euiThemeVars.euiColorLightestShade,
    'editor.selectionHighlightBorder': euiThemeVars.euiColorLightShade,
    'editorSuggestWidget.background': euiThemeVars.euiColorEmptyShade,
    'editorSuggestWidget.border': euiThemeVars.euiColorEmptyShade,
    'editorSuggestWidget.focusHighlightForeground': euiThemeVars.euiColorEmptyShade,
    'editorSuggestWidget.foreground': euiThemeVars.euiTextColor,
    'editorSuggestWidget.highlightForeground': euiThemeVars.euiColorPrimary,
    'editorSuggestWidget.selectedBackground': euiThemeVars.euiColorPrimary,
    'editorSuggestWidget.selectedForeground': euiThemeVars.euiColorEmptyShade,
  },
});
