/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular from 'angular';
import 'angular-mocks';

import * as i18nCore from '../core/i18n';
import { I18nProvider, I18nServiceType } from './provider';

angular.module('app', []).provider('i18n', I18nProvider);

describe('i18nProvider', () => {
  let provider: I18nProvider;
  let service: I18nServiceType;

  beforeEach(
    angular.mock.module('app', [
      'i18nProvider',
      (i18n: I18nProvider) => {
        provider = i18n;
      },
    ])
  );
  beforeEach(
    angular.mock.inject((i18n: I18nServiceType) => {
      service = i18n;
    })
  );

  test('provides wrapper around i18n engine', () => {
    expect(service).toEqual(i18nCore.translate);
  });

  test('provides service wrapper around i18n engine', () => {
    const serviceMethodNames = Object.keys(provider);
    const pluginMethodNames = Object.keys(i18nCore);

    expect([...serviceMethodNames, 'translate'].sort()).toEqual(
      [...pluginMethodNames, '$get'].sort()
    );
  });
});
