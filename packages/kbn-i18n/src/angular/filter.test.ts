/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../core/i18n', () => ({
  translate: jest.fn().mockImplementation(() => 'translation'),
}));

import angular from 'angular';
import 'angular-mocks';

import * as i18n from '../core/i18n';
import { i18nFilter as angularI18nFilter } from './filter';
import { I18nProvider, I18nServiceType } from './provider';

angular.module('app', []).provider('i18n', I18nProvider).filter('i18n', angularI18nFilter);

describe('i18nFilter', () => {
  let filter: I18nServiceType;

  beforeEach(angular.mock.module('app'));
  beforeEach(
    angular.mock.inject((i18nFilter) => {
      filter = i18nFilter;
    })
  );
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('provides wrapper around i18n engine', () => {
    const id = 'id';
    const defaultMessage = 'default-message';
    const values = {};

    const result = filter(id, { defaultMessage, values });

    expect(result).toEqual('translation');
    expect(i18n.translate).toHaveBeenCalledTimes(1);
    expect(i18n.translate).toHaveBeenCalledWith(id, { defaultMessage, values });
  });
});
