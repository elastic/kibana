/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { darkMode } from '@kbn/ui-theme';
import { buildLightTheme, buildDarkTheme } from '../code_editor';
import { themeRuleGroupBuilderFactory } from '../common/theme';
import { monaco } from '../monaco_imports';

const buildRuleGroup = themeRuleGroupBuilderFactory();

const background = euiThemeVars.euiFormBackgroundColor;
const booleanTextColor = '#585CF6';
const methodTextColor = '#DD0A73';
const urlTextColor = '#00A69B';
const defaultStatusBackgroundColor = darkMode ? '#191B20' : '#F7F8FA';
const successStatusBackgroundColor = darkMode ? '#212B30' : '#E7F5F5';
const primaryStatusBackgroundColor = darkMode ? '#1E232D' : '#EBF1F7';
const warningStatusBackgroundColor = darkMode ? '#2C2B25' : '#FBF6E9';
const dangerStatusBackgroundColor = darkMode ? '#2E2024' : '#F6E6E7';
export const buildConsoleTheme = (): monaco.editor.IStandaloneThemeData => {
  const euiTheme = darkMode ? buildDarkTheme() : buildLightTheme();
  return {
    ...euiTheme,
    rules: [
      ...euiTheme.rules,
      ...buildRuleGroup(
        ['string-literal', 'multi-string', 'punctuation.end-triple-quote'],
        makeHighContrastColor(euiThemeVars.euiColorDangerText)(background)
      ),
      ...buildRuleGroup(
        ['constant.language.boolean'],
        makeHighContrastColor(booleanTextColor)(background)
      ),
      ...buildRuleGroup(
        ['constant.numeric'],
        makeHighContrastColor(euiThemeVars.euiColorAccentText)(background)
      ),
      ...buildRuleGroup(
        ['comment.default'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(defaultStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['comment.success'],
        makeHighContrastColor(euiThemeVars.euiColorSuccessText)(successStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['comment.primary'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(primaryStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['comment.warning'],
        makeHighContrastColor(euiThemeVars.euiColorWarningText)(warningStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['comment.danger'],
        makeHighContrastColor(euiThemeVars.euiColorDangerText)(dangerStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['status.default'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(defaultStatusBackgroundColor),
        true
      ),
      ...buildRuleGroup(
        ['status.success'],
        makeHighContrastColor(euiThemeVars.euiColorSuccessText)(successStatusBackgroundColor),
        true
      ),
      ...buildRuleGroup(
        ['status.primary'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(primaryStatusBackgroundColor),
        true
      ),
      ...buildRuleGroup(
        ['status.warning'],
        makeHighContrastColor(euiThemeVars.euiColorWarningText)(warningStatusBackgroundColor),
        true
      ),
      ...buildRuleGroup(
        ['status.danger'],
        makeHighContrastColor(euiThemeVars.euiColorDangerText)(dangerStatusBackgroundColor),
        true
      ),
      ...buildRuleGroup(['method'], makeHighContrastColor(methodTextColor)(background)),
      ...buildRuleGroup(['url'], makeHighContrastColor(urlTextColor)(background)),
    ],
    colors: {
      ...euiTheme.colors,
      'editorLineNumber.foreground': euiThemeVars.euiTextColor,
    },
  };
};
