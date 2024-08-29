/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
        ['status.info'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(background)
      ),
      ...buildRuleGroup(
        ['status.success'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(euiThemeVars.euiColorSuccess)
      ),
      ...buildRuleGroup(
        ['status.redirect'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(background)
      ),
      ...buildRuleGroup(
        ['status.warning'],
        makeHighContrastColor(euiThemeVars.euiTextColor)(euiThemeVars.euiColorWarning)
      ),
      ...buildRuleGroup(
        ['status.error'],
        makeHighContrastColor('#FFFFFF')(euiThemeVars.euiColorDanger)
      ),
      ...buildRuleGroup(['method'], makeHighContrastColor(methodTextColor)(background)),
      ...buildRuleGroup(['url'], makeHighContrastColor(urlTextColor)(background)),
    ],
  };
};
