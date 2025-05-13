/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor, type UseEuiTheme } from '@elastic/eui';
import { defaultThemesResolvers, CODE_EDITOR_DEFAULT_THEME_ID } from '../../code_editor';
import { themeRuleGroupBuilderFactory } from '../../common/theme';

const buildRuleGroup = themeRuleGroupBuilderFactory();

const getConsoleColorConfig = (themeVars: UseEuiTheme['euiTheme']) => {
  return {
    background: themeVars.colors.backgroundBaseSubdued,
    booleanTextColor: themeVars.colors.textPrimary,
    methodTextColor: themeVars.colors.textAccent,
    urlTextColor: themeVars.colors.textAccentSecondary,
    defaultStatusBackgroundColor: themeVars.colors.backgroundLightAccentSecondary,
    successStatusBackgroundColor: themeVars.colors.backgroundLightSuccess,
    primaryStatusBackgroundColor: themeVars.colors.backgroundLightPrimary,
    warningStatusBackgroundColor: themeVars.colors.backgroundLightWarning,
    dangerStatusBackgroundColor: themeVars.colors.backgroundLightDanger,
  };
};

export const buildConsoleTheme = ({ colorMode, euiTheme, ...rest }: UseEuiTheme) => {
  const consoleColors = getConsoleColorConfig(euiTheme);

  const themeBase = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID]({
    colorMode,
    euiTheme,
    ...rest,
  });

  return {
    ...themeBase,
    rules: [
      ...themeBase.rules,
      ...buildRuleGroup(
        ['string-literal', 'multi-string', 'punctuation.end-triple-quote'],
        makeHighContrastColor(euiTheme.colors.textDanger)(consoleColors.background)
      ),
      ...buildRuleGroup(
        ['constant.language.boolean'],
        makeHighContrastColor(consoleColors.booleanTextColor)(consoleColors.background)
      ),
      ...buildRuleGroup(
        ['constant.numeric'],
        makeHighContrastColor(euiTheme.colors.textAccent)(consoleColors.background)
      ),
      ...buildRuleGroup(
        ['comment.default'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.defaultStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['comment.success'],
        makeHighContrastColor(euiTheme.colors.textSuccess)(
          consoleColors.successStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['comment.primary'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.primaryStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['comment.warning'],
        makeHighContrastColor(euiTheme.colors.textWarning)(
          consoleColors.warningStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['comment.danger'],
        makeHighContrastColor(euiTheme.colors.textDanger)(consoleColors.dangerStatusBackgroundColor)
      ),
      ...buildRuleGroup(
        ['status.default'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.defaultStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['status.success'],
        makeHighContrastColor(euiTheme.colors.textSuccess)(
          consoleColors.successStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['status.primary'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.primaryStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['status.warning'],
        makeHighContrastColor(euiTheme.colors.textWarning)(
          consoleColors.warningStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['status.danger'],
        makeHighContrastColor(euiTheme.colors.textDanger)(
          consoleColors.dangerStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['method'],
        makeHighContrastColor(consoleColors.methodTextColor)(consoleColors.background)
      ),
      ...buildRuleGroup(
        ['url'],
        makeHighContrastColor(consoleColors.urlTextColor)(consoleColors.background)
      ),
    ],
    colors: {
      ...themeBase.colors,
      'editorLineNumber.foreground': euiTheme.colors.textPrimary,
    },
  };
};
