/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';

jest.mock('@elastic/eui', () => {
  return {
    EuiContext: function MockEuiContext({
      i18n,
      children,
    }: {
      i18n: any;
      children: React.ReactNode;
    }) {
      return JSON.stringify(i18n, null, 2);
    },
  };
});

jest.mock('@kbn/i18n-react', () => {
  return {
    I18nProvider: function MockI18nProvider({ children }: { children: React.ReactNode }) {
      return children;
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

    expect(render(<i18n.Context>content</i18n.Context>).container.innerHTML).toMatchSnapshot();
  });
});
