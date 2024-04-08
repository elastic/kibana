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

const buildRuleGroup = themeRuleGroupBuilderFactory();

const background = euiThemeVars.euiColorLightestShade;
const stringTextColor = '#009926';
const commentTextColor = '#4C886B';
const variableTextColor = '#0079A5';
const booleanTextColor = '#585CF6';
const numericTextColor = variableTextColor;

/**
 * A utility function that returns theme rules that are shared between Console editor and
 * the Console output panel when it is in JSON mode.
 */
export const buildConsoleSharedJsonRules = () => {
  return [
    ...buildRuleGroup(
      ['string', 'string-literal', 'multi-string', 'punctuation.end-triple-quote'],
      makeHighContrastColor(stringTextColor)(background)
    ),
    ...buildRuleGroup(['comment'], makeHighContrastColor(commentTextColor)(background)),
    ...buildRuleGroup(['variable'], makeHighContrastColor(variableTextColor)(background)),
    ...buildRuleGroup(
      ['constant.language.boolean'],
      makeHighContrastColor(booleanTextColor)(background)
    ),
    ...buildRuleGroup(['constant.numeric'], makeHighContrastColor(numericTextColor)(background)),
  ];
};
