/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { makeHighContrastColor } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { themeRuleGroupBuilderFactory } from '../../common/theme';
import { monaco } from '../../monaco_imports';
import { buildConsoleBasicTheme } from './basic_theme';
import { buildConsoleSharedJsonRules } from './shared_json_rules';

const buildRuleGroup = themeRuleGroupBuilderFactory();

const background = euiThemeVars.euiColorLightestShade;
const methodTextColor = '#DD0A73';
const urlTextColor = '#00A69B';
export const buildConsoleTheme = (): monaco.editor.IStandaloneThemeData => {
  const basicTheme = buildConsoleBasicTheme();
  const sharedJsonRules = buildConsoleSharedJsonRules();
  return {
    ...basicTheme,
    rules: [
      ...sharedJsonRules,
      ...buildRuleGroup(['method'], makeHighContrastColor(methodTextColor)(background)),
      ...buildRuleGroup(['url'], makeHighContrastColor(urlTextColor)(background)),
    ],
  };
};
