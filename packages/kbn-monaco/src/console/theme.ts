/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { darkMode, euiThemeVars } from '@kbn/ui-theme';

import { themeRuleGroupBuilderFactory } from '../common/theme';
import { monaco } from '../monaco_imports';
import { CONSOLE_POSTFIX } from './constants';

const buildRuleGroup = themeRuleGroupBuilderFactory(CONSOLE_POSTFIX);

export const buildConsoleTheme = (): monaco.editor.IStandaloneThemeData => {
  return {
    base: darkMode ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      // method
      ...buildRuleGroup(['method'], euiThemeVars.euiColorAccentText),
      // url
      ...buildRuleGroup(['url'], euiThemeVars.euiColorSuccessText),
      // variable
      ...buildRuleGroup(['variable'], euiThemeVars.euiColorPrimaryText),
      // comment
      ...buildRuleGroup(['comment'], euiThemeVars.euiColorMediumShade),
    ],
    colors: {
      'editor.background': euiThemeVars.euiColorLightestShade,
      // color of the line numbers
      'editorLineNumber.foreground': euiThemeVars.euiColorDarkShade,
      // color of the active line number
      'editorLineNumber.activeForeground': euiThemeVars.euiColorDarkShade,
      // background of the line numbers side panel
      'editorGutter.background': euiThemeVars.euiColorEmptyShade,
    },
  };
};
