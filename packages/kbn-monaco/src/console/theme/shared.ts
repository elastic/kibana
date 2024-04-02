/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { makeHighContrastColor } from '@elastic/eui';
import { darkMode, euiThemeVars } from '@kbn/ui-theme';

import { themeRuleGroupBuilderFactory } from '../../common/theme';
import { monaco } from '../../monaco_imports';

const buildRuleGroup = themeRuleGroupBuilderFactory();

const background = euiThemeVars.euiColorLightestShade;
const commentTextColor = '#4C886B';
const variableTextColor = '#0079A5';
const booleanTextColor = '#585CF6';
const numericTextColor = variableTextColor;
export const buildConsoleSharedTheme = (): monaco.editor.IStandaloneThemeData => {
  return {
    base: darkMode ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      ...buildRuleGroup(['comment'], makeHighContrastColor(commentTextColor)(background)),
      ...buildRuleGroup(['variable'], makeHighContrastColor(variableTextColor)(background)),
      ...buildRuleGroup(
        ['constant.language.boolean'],
        makeHighContrastColor(booleanTextColor)(background)
      ),
      ...buildRuleGroup(['constant.numeric'], makeHighContrastColor(numericTextColor)(background)),
    ],
    colors: {
      'editor.background': background,
      // color of the line numbers
      'editorLineNumber.foreground': euiThemeVars.euiColorDarkShade,
      // color of the active line number
      'editorLineNumber.activeForeground': euiThemeVars.euiColorDarkShade,
      // background of the line numbers side panel
      'editorGutter.background': euiThemeVars.euiColorEmptyShade,
    },
  };
};
