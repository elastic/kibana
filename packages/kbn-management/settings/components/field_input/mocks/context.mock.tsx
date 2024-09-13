/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactChild } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { I18nStart } from '@kbn/core-i18n-browser';

import { FieldInputProvider } from '../services';
import { FieldInputServices } from '../types';

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

export const createFieldInputServicesMock = (): FieldInputServices => ({
  showDanger: jest.fn(),
  validateChange: async () => {
    return { successfulValidation: true, valid: true };
  },
});

export const TestWrapper = ({
  children,
  services = createFieldInputServicesMock(),
}: {
  children: ReactChild;
  services?: FieldInputServices;
}) => {
  return (
    <KibanaRootContextProvider {...createRootMock()}>
      <FieldInputProvider {...services}>{children}</FieldInputProvider>
    </KibanaRootContextProvider>
  );
};

export const wrap = (
  component: JSX.Element,
  services: FieldInputServices = createFieldInputServicesMock()
) => (
  <KibanaRootContextProvider {...createRootMock()}>
    <TestWrapper {...services}>{component}</TestWrapper>
  </KibanaRootContextProvider>
);
