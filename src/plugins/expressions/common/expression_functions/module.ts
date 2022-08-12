/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, interfaces } from 'inversify';
import { KibanaRequestToken, UiSettingsClientToken } from '../module';
import {
  clog,
  createTable,
  font,
  getUiSettingFn,
  variableSet,
  variable,
  theme,
  cumulativeSum,
  derivative,
  movingAverage,
  overallMetric,
  mapColumn,
  math,
  mathColumn,
  UiSettingsClientFactory,
} from './specs';
import { AnyExpressionFunctionDefinition } from './types';

export const FunctionToken: interfaces.ServiceIdentifier<AnyExpressionFunctionDefinition> =
  Symbol.for('Function');
export const UiSettingsFactoryToken: interfaces.ServiceIdentifier<UiSettingsClientFactory> =
  Symbol.for('UiSettingsFactory');

export function FunctionsModule() {
  return new ContainerModule((bind) => {
    [
      clog,
      createTable,
      font,
      variableSet,
      variable,
      theme,
      cumulativeSum,
      derivative,
      movingAverage,
      overallMetric,
      mapColumn,
      math,
      mathColumn,
    ].forEach((fn) => bind(FunctionToken).toConstantValue(fn));
    bind(FunctionToken)
      .toDynamicValue(({ container }) =>
        getUiSettingFn({
          uiSettingsClientFactory: container.get(UiSettingsFactoryToken),
        })
      )
      .inSingletonScope();
    bind(UiSettingsFactoryToken).toProvider(
      ({ container }): UiSettingsClientFactory =>
        (getKibanaRequest) => {
          const scope = container.createChild();
          scope.bind(KibanaRequestToken).toDynamicValue(getKibanaRequest).inSingletonScope();

          return scope.getAsync(UiSettingsClientToken);
        }
    );
  });
}
