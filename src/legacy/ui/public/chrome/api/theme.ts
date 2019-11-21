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

import * as Rx from 'rxjs';

import { npStart } from 'ui/new_platform';
import { ChromeBrand } from '../../../../../core/public';

const newPlatformChrome = npStart.core.chrome;

export function initChromeThemeApi(chrome: { [key: string]: any }) {
  const brandCache$ = new Rx.BehaviorSubject<ChromeBrand>({});
  newPlatformChrome.getBrand$().subscribe(brandCache$);

  const applicationClassesCache$ = new Rx.BehaviorSubject<string[]>([]);
  newPlatformChrome.getApplicationClasses$().subscribe(applicationClassesCache$);

  chrome.setBrand = (brand: ChromeBrand) => {
    newPlatformChrome.setBrand(brand);
    return chrome;
  };

  chrome.getBrand = (key: keyof ChromeBrand) => {
    return brandCache$.getValue()[key];
  };

  chrome.addApplicationClass = (classNames: string | string[] = []) => {
    if (typeof classNames === 'string') {
      classNames = [classNames];
    }

    for (const className of classNames) {
      newPlatformChrome.addApplicationClass(className);
    }

    return chrome;
  };

  chrome.removeApplicationClass = (classNames: string | string[]) => {
    if (typeof classNames === 'string') {
      classNames = [classNames];
    }

    for (const className of classNames) {
      newPlatformChrome.removeApplicationClass(className);
    }
    return chrome;
  };

  chrome.getApplicationClasses = () => {
    return applicationClassesCache$.getValue().join(' ');
  };
}
