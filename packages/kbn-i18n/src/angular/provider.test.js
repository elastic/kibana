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

import angular from 'angular';
import 'angular-mocks';
import { i18nProvider } from './provider';
import * as i18n from '../core/i18n';

jest.mock('../core/i18n', () => ({
  addMessages: jest.fn(),
  getMessages: jest.fn(),
  setLocale: jest.fn(),
  getLocale: jest.fn(),
  setDefaultLocale: jest.fn(),
  getDefaultLocale: jest.fn(),
  setFormats: jest.fn(),
  getFormats: jest.fn(),
  getRegisteredLocales: jest.fn(),
  init: jest.fn(),
  translate: jest.fn(),
}));

angular.module('app', []).provider('i18n', i18nProvider);

describe('i18nProvider', () => {
  let provider;
  let service;

  beforeEach(
    angular.mock.module('app', [
      'i18nProvider',
      i18n => {
        service = i18n;
      },
    ])
  );
  beforeEach(
    angular.mock.inject(i18n => {
      provider = i18n;
    })
  );
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('provides wrapper under i18n engine', () => {
    expect(provider).toEqual(i18n.translate);
  });

  it('provides service wrapper under i18n engine', () => {
    expect(service.addMessages).toEqual(i18n.addMessages);
    expect(service.getMessages).toEqual(i18n.getMessages);
    expect(service.setLocale).toEqual(i18n.setLocale);
    expect(service.getLocale).toEqual(i18n.getLocale);
    expect(service.setDefaultLocale).toEqual(i18n.setDefaultLocale);
    expect(service.getDefaultLocale).toEqual(i18n.getDefaultLocale);
    expect(service.setFormats).toEqual(i18n.setFormats);
    expect(service.getFormats).toEqual(i18n.getFormats);
    expect(service.getRegisteredLocales).toEqual(i18n.getRegisteredLocales);
    expect(service.init).toEqual(i18n.init);
  });
});
