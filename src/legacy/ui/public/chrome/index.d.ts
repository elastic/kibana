/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectsClientContract } from 'src/core/public';
import { ChromeBrand } from '../../../../core/public';
import { BadgeApi } from './api/badge';
import { BreadcrumbsApi } from './api/breadcrumbs';
import { HelpExtensionApi } from './api/help_extension';
import { ChromeNavLinks } from './api/nav';

export interface IInjector {
  get<T>(injectable: string): T;
  invoke<T, T2>(
    injectable: (this: T2, ...args: any[]) => T,
    self?: T2,
    locals?: { [key: string]: any }
  ): T;
  instantiate(constructor: Function, locals?: { [key: string]: any }): any;
}

declare interface Chrome extends ChromeNavLinks {
  badge: BadgeApi;
  breadcrumbs: BreadcrumbsApi;
  helpExtension: HelpExtensionApi;
  addBasePath<T = string>(path: T): T;
  dangerouslyGetActiveInjector(): Promise<IInjector>;
  getBasePath(): string;
  getXsrfToken(): string;
  getKibanaVersion(): string;
  getSavedObjectsClient(): SavedObjectsClientContract;
  getUiSettingsClient(): any;
  setVisible(visible: boolean): any;
  getInjected(key: string, defaultValue?: any): any;
  setRootController(name: string, Controller: any): any;
  setBrand(brand: ChromeBrand): this;
  getBrand(key: keyof ChromeBrand): ChromeBrand[keyof ChromeBrand];
  addApplicationClass(classNames: string | string[]): this;
  removeApplicationClass(classNames: string | string[]): this;
  getApplicationClasses(): string;
}

declare const chrome: Chrome;

// eslint-disable-next-line import/no-default-export
export default chrome;
export { Chrome };
export { Breadcrumb } from './api/breadcrumbs';
export { HelpExtension } from './api/help_extension';
