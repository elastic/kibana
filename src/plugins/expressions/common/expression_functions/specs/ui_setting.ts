/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../..';
import { UiSetting } from '../../expression_types/specs/ui_setting';

/**
 * Note: The UiSettings client interface is different between the browser and server.
 * For that reason we can't expose a common getUiSettingFn for both environments.
 * To maintain the consistency with the current file structure, we expose 2 separate functions
 * from this file inside the "common" folder.
 */

interface UiSettingsClientBrowser {
  get<T>(key: string, defaultValue?: T): T | Promise<T>;
}

interface UiSettingStartDependenciesBrowser {
  uiSettings: UiSettingsClientBrowser;
}

interface UiSettingFnArgumentsBrowser {
  getStartDependencies(
    getKibanaRequest: () => KibanaRequest
  ): Promise<UiSettingStartDependenciesBrowser>;
}

interface UiSettingsClientServer {
  get<T>(key: string): T | Promise<T>;
}

interface UiSettingStartDependenciesServer {
  uiSettings: UiSettingsClientServer;
}

interface UiSettingFnArgumentsServer {
  getStartDependencies(
    getKibanaRequest: () => KibanaRequest
  ): Promise<UiSettingStartDependenciesServer>;
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

const commonExpressionFnSettings: Omit<ExpressionFunctionUiSetting, 'fn'> = {
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
};

const kibanaRequestError = new Error(
  i18n.translate('expressions.functions.uiSetting.error.kibanaRequest', {
    defaultMessage:
      'A KibanaRequest is required to get UI settings on the server. ' +
      'Please provide a request object to the expression execution params.',
  })
);

const getInvalidParameterError = (parameter: string) =>
  new Error(
    i18n.translate('expressions.functions.uiSetting.error.parameter', {
      defaultMessage: 'Invalid parameter "{parameter}".',
      values: { parameter },
    })
  );

export function getUiSettingFnBrowser({
  getStartDependencies,
}: UiSettingFnArgumentsBrowser): ExpressionFunctionUiSetting {
  return {
    ...commonExpressionFnSettings,
    async fn(input, { default: defaultValue, parameter }, { getKibanaRequest }) {
      const { uiSettings } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw kibanaRequestError;
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
        throw getInvalidParameterError(parameter);
      }
    },
  };
}

export function getUiSettingFnServer({
  getStartDependencies,
}: UiSettingFnArgumentsServer): ExpressionFunctionUiSetting {
  return {
    ...commonExpressionFnSettings,
    async fn(input, { parameter }, { getKibanaRequest }) {
      const { uiSettings } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw kibanaRequestError;
        }

        return request;
      });

      try {
        return {
          type: 'ui_setting',
          key: parameter,
          value: await uiSettings.get(parameter),
        };
      } catch {
        throw getInvalidParameterError(parameter);
      }
    },
  };
}
