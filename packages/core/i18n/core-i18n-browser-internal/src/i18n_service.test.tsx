/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';

jest.mock('@elastic/eui', () => {
  return {
    EuiContext: function MockEuiContext() {
      // no-op
    },
  };
});

jest.mock('@kbn/i18n-react', () => {
  return {
    I18nProvider: function MockI18nProvider() {
      // no-op
    },
  };
});

import React from 'react';

import { I18nService } from './i18n_service';

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

describe('#start()', () => {
  it('returns `Context` component', () => {
    const i18nService = new I18nService();

    const i18n = i18nService.start();

    expect(shallow(<i18n.Context>content</i18n.Context>)).toMatchSnapshot();
  });
});
