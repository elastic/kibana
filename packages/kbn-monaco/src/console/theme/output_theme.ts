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
import { buildConsoleSharedTheme } from './shared';

const buildRuleGroup = themeRuleGroupBuilderFactory();

const background = euiThemeVars.euiColorLightestShade;
const stringTextColor = '#007C1E';
const booleanTextColor = '#990000';
export const buildConsoleOutputTheme = (): monaco.editor.IStandaloneThemeData => {
  const sharedTheme = buildConsoleSharedTheme();
  return {
    ...sharedTheme,
    rules: [
      ...sharedTheme.rules,
      ...buildRuleGroup(
        ['string', 'string-literal', 'multi-string', 'punctuation.end-triple-quote'],
        makeHighContrastColor(stringTextColor)(background)
      ),
      ...buildRuleGroup(
        ['constant.language.boolean'],
        makeHighContrastColor(booleanTextColor)(background)
      ),
    ],
  };
};
