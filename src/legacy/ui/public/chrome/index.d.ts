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

import { ChromeBrand } from '../../../../core/public';
import { SavedObjectsClient } from '../saved_objects';
import { BadgeApi } from './api/badge';
import { BreadcrumbsApi } from './api/breadcrumbs';
import { HelpExtensionApi } from './api/help_extension';
import { ChromeNavLinks } from './api/nav';

interface IInjector {
  get<T>(injectable: string): T;
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
  getSavedObjectsClient(): SavedObjectsClient;
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
export { NavLink } from './api/nav';
export { HelpExtension } from './api/help_extension';
