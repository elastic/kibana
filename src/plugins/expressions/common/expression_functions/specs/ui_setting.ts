/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getUiSettings } from '../../../common';
import { UiSetting } from '../../expression_types/specs/ui_setting';

export interface UiSettingArguments {
  default?: unknown;
  parameter: string;
}

export type ExpressionFunctionUiSetting = ExpressionFunctionDefinition<
  'uiSetting',
  unknown,
  UiSettingArguments,
  UiSetting
>;

export const uiSetting: ExpressionFunctionUiSetting = {
  name: 'uiSetting',
  help: i18n.translate('expressions.functions.uiSetting.help', {
    defaultMessage: 'Returns a UI settings parameter value.',
  }),
  args: {
    default: {
      help: i18n.translate('expressions.functions.uiSetting.args.default', {
        defaultMessage: 'A default value in case of the parameter is not set.',
      }),
    },
    parameter: {
      aliases: ['_'],
      help: i18n.translate('expressions.functions.uiSetting.args.parameter', {
        defaultMessage: 'The parameter name.',
      }),
      required: true,
      types: ['string'],
    },
  },
  fn(input, { default: defaultValue, parameter }) {
    const uiSettings = getUiSettings();

    try {
      return {
        type: 'ui_setting',
        key: parameter,
        value: uiSettings.get(parameter, defaultValue),
      };
    } catch {
      throw new Error(
        i18n.translate('expressions.functions.uiSetting.args.parameter.invalid', {
          defaultMessage: 'Invalid parameter "{parameter}".',
          values: { parameter },
        })
      );
    }
  },
};
