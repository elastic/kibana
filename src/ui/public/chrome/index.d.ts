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

import { Brand } from '../../../core/public/chrome';

interface IInjector {
  get<T>(injectable: string): T;
}

declare class Chrome {
  public addBasePath<T = string>(path: T): T;
  public dangerouslyGetActiveInjector(): Promise<IInjector>;
  public getBasePath(): string;
  public getXsrfToken(): string;
  public getKibanaVersion(): string;
  public getUiSettingsClient(): any;
  public setVisible(visible: boolean): any;
  public getInjected(key: string, defaultValue?: any): any;
  public setRootController(name: string, Controller: any): any;
  public setBrand(brand: Brand): this;
  public getBrand(key: keyof Brand): Brand[keyof Brand];
  public addApplicationClass(classNames: string | string[]): this;
  public removeApplicationClass(classNames: string | string[]): this;
  public getApplicationClasses(): string;
}

declare const chrome: Chrome;

export default chrome;
