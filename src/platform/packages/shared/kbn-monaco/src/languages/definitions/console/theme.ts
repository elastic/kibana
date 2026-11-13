/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor, type UseEuiTheme } from '@elastic/eui';
import { themeRuleGroupBuilderFactory } from '../../theming/helpers';
import type { KbnMonacoLanguageThemeResolver } from '../../theming';

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

/**
 * Console's own token rules. The shared palette is seeded into Console's namespace at registration,
 * so only the overrides are listed here.
 */
export const buildConsoleTheme: KbnMonacoLanguageThemeResolver = ({ euiTheme }) => {
  const consoleColors = getConsoleColorConfig(euiTheme);

  return {
    rules: [
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
        ['method'],
        makeHighContrastColor(consoleColors.methodTextColor)(consoleColors.background)
      ),
      ...buildRuleGroup(
        ['url'],
        makeHighContrastColor(consoleColors.urlTextColor)(consoleColors.background)
      ),
    ],
  };
};

export const buildConsoleOutputTheme: KbnMonacoLanguageThemeResolver = ({ euiTheme }) => {
  const consoleColors = getConsoleColorConfig(euiTheme);

  return {
    rules: [
      ...buildRuleGroup(
        ['status.default'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.defaultStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['comment.default'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.defaultStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['status.success'],
        makeHighContrastColor(euiTheme.colors.textSuccess)(
          consoleColors.successStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['comment.success'],
        makeHighContrastColor(euiTheme.colors.textSuccess)(
          consoleColors.successStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['status.primary'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.primaryStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['comment.primary'],
        makeHighContrastColor(euiTheme.colors.textPrimary)(
          consoleColors.primaryStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['status.warning'],
        makeHighContrastColor(euiTheme.colors.textWarning)(
          consoleColors.warningStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['comment.warning'],
        makeHighContrastColor(euiTheme.colors.textWarning)(
          consoleColors.warningStatusBackgroundColor
        )
      ),
      ...buildRuleGroup(
        ['status.danger'],
        makeHighContrastColor(euiTheme.colors.textDanger)(
          consoleColors.dangerStatusBackgroundColor
        ),
        true
      ),
      ...buildRuleGroup(
        ['comment.danger'],
        makeHighContrastColor(euiTheme.colors.textDanger)(consoleColors.dangerStatusBackgroundColor)
      ),
    ],
  };
};
