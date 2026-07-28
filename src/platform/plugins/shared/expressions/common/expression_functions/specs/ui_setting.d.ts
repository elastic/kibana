/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ExpressionFunctionDefinition } from '../..';
import type { UiSetting } from '../../expression_types/specs/ui_setting';
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
export declare function getUiSettingFnBrowser({
  getStartDependencies,
}: UiSettingFnArgumentsBrowser): ExpressionFunctionUiSetting;
export declare function getUiSettingFnServer({
  getStartDependencies,
}: UiSettingFnArgumentsServer): ExpressionFunctionUiSetting;
export {};
