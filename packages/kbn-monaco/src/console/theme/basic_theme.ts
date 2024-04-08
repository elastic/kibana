/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { darkMode, euiThemeVars } from '@kbn/ui-theme';
import { monaco } from '../../monaco_imports';

const background = euiThemeVars.euiColorLightestShade;

/**
 * A utility function that returns a theme with the basic theme features that are used
 * in both the Console editor and the Console output panel in all modes.
 */
export const buildConsoleBasicTheme = (): monaco.editor.IStandaloneThemeData => {
  return {
    base: darkMode ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
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
