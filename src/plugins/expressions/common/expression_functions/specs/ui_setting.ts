/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../..';
import { UiSetting } from '../../expression_types/specs/ui_setting';

interface UiSettingsClient {
  get<T>(key: string, defaultValue?: T): T | Promise<T>;
}

interface UiSettingStartDependencies {
  uiSettings: UiSettingsClient;
}

interface UiSettingFnArguments {
  getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<UiSettingStartDependencies>;
}

export interface UiSettingArguments {
  default?: unknown;
  parameter: string;
}

export type ExpressionFunctionUiSetting = ExpressionFunctionDefinition<
  'uiSetting',
  unknown,
  UiSettingArguments,
  Promise<UiSetting>
>;

export function getUiSettingFn({
  getStartDependencies,
}: UiSettingFnArguments): ExpressionFunctionUiSetting {
  return {
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
    async fn(input, { default: defaultValue, parameter }, { getKibanaRequest }) {
      const { uiSettings } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw new Error(
            i18n.translate('expressions.functions.uiSetting.error.kibanaRequest', {
              defaultMessage:
                'A KibanaRequest is required to get UI settings on the server. ' +
                'Please provide a request object to the expression execution params.',
            })
          );
        }

        return request;
      });

      try {
        return {
          type: 'ui_setting',
          key: parameter,
          value: await uiSettings.get(parameter, defaultValue),
        };
      } catch {
        throw new Error(
          i18n.translate('expressions.functions.uiSetting.error.parameter', {
            defaultMessage: 'Invalid parameter "{parameter}".',
            values: { parameter },
          })
        );
      }
    },
  };
}
