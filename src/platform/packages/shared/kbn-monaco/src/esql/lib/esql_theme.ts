/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { themeRuleGroupBuilderFactory } from '../../common/theme';
import { ESQL_TOKEN_POSTFIX } from './constants';
import { monaco } from '../../monaco_imports';

const buildRuleGroup = themeRuleGroupBuilderFactory(ESQL_TOKEN_POSTFIX);

export const buildESQLTheme = ({
  euiTheme,
  colorMode,
}: UseEuiTheme): monaco.editor.IStandaloneThemeData => {
  return {
    base: colorMode === 'DARK' ? 'vs-dark' : 'vs',
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
          'left_braces',
          'right_braces',
          'quoted_identifier',
          'unquoted_identifier',
          'pipe',
        ],
        euiTheme.colors.textParagraph
      ),

      // source commands
      ...buildRuleGroup(
        ['from', 'row', 'show'],
        euiTheme.colors.primary,
        true // isBold
      ),

      // commands
      ...buildRuleGroup(
        [
          'dev_metrics',
          'metadata',
          'mv_expand',
          'stats',
          'dev_inlinestats',
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
          'dev_lookup',
          'dev_join_full',
          'dev_join_left',
          'dev_join_right',
          'null',
          'enrich',
          'on',
          'using',
          'with',
          'asc',
          'desc',
          'nulls_order',
          'join_lookup',
          'join',
        ],
        euiTheme.colors.accent,
        true // isBold
      ),

      // functions
      ...buildRuleGroup(['functions'], euiTheme.colors.primary),

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
        euiTheme.colors.primary
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
          'join_line_comment',
          'join_multiline_comment',
          'show_line_comment',
          'show_multiline_comment',
          'setting',
          'setting_line_comment',
          'settting_multiline_comment',
          'metrics_line_comment',
          'metrics_multiline_comment',
          'closing_metrics_line_comment',
          'closing_metrics_multiline_comment',
        ],
        euiTheme.colors.textSubdued
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
        euiTheme.colors.textSuccess
      ),
    ],
    colors: {
      'editor.foreground': euiTheme.colors.textParagraph,
      'editor.background': euiTheme.colors.backgroundBasePlain,
      'editor.lineHighlightBackground': euiTheme.colors.lightestShade,
      'editor.lineHighlightBorder': euiTheme.colors.lightestShade,
      'editor.selectionHighlightBackground': euiTheme.colors.lightestShade,
      'editor.selectionHighlightBorder': euiTheme.colors.lightShade,
      'editorSuggestWidget.background': euiTheme.colors.emptyShade,
      'editorSuggestWidget.border': euiTheme.colors.emptyShade,
      'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.emptyShade,
      'editorSuggestWidget.foreground': euiTheme.colors.textParagraph,
      'editorSuggestWidget.highlightForeground': euiTheme.colors.primary,
      'editorSuggestWidget.selectedBackground': euiTheme.colors.primary,
      'editorSuggestWidget.selectedForeground': euiTheme.colors.emptyShade,
    },
  };
};
