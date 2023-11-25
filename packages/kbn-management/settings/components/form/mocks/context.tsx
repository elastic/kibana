/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactChild } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { I18nStart } from '@kbn/core-i18n-browser';

import { createFieldRowServicesMock } from '@kbn/management-settings-components-field-row/mocks';
import { FormProvider } from '../services';
import type { FormServices } from '../types';

const createRootMock = () => {
  const analytics = analyticsServiceMock.createAnalyticsServiceStart();
  const i18n: I18nStart = {
    Context: ({ children }) => <I18nProvider>{children}</I18nProvider>,
  };
  const theme = themeServiceMock.createStartContract();
  return {
    analytics,
    i18n,
    theme,
  };
};

export const createFormServicesMock = (): FormServices => ({
  ...createFieldRowServicesMock(),
  saveChanges: jest.fn(),
  showError: jest.fn(),
  showReloadPagePrompt: jest.fn(),
});

export const TestWrapper = ({
  children,
  services = createFormServicesMock(),
}: {
  children: ReactChild;
  services?: FormServices;
}) => {
  return (
    <KibanaRootContextProvider {...createRootMock()}>
      <FormProvider {...services}>{children}</FormProvider>
    </KibanaRootContextProvider>
  );
};

export const wrap = (component: JSX.Element, services: FormServices = createFormServicesMock()) => (
  <TestWrapper services={services} children={component} />
);
