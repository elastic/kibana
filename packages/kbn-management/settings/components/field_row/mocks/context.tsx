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

import { createFieldInputServicesMock } from '@kbn/management-settings-components-field-input/mocks';
import { FieldInputServices } from '@kbn/management-settings-components-field-input/mocks';
import { FieldRowProvider } from '../services';
import { FieldRowServices } from '../types';

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

export const createFieldRowServicesMock = (): FieldRowServices => ({
  ...createFieldInputServicesMock(),
  links: { deprecationKey: 'link/to/deprecation/docs' },
});

export const TestWrapper = ({
  children,
  services = createFieldRowServicesMock(),
}: {
  children: ReactChild;
  services?: FieldRowServices;
}) => {
  return (
    <KibanaRootContextProvider {...createRootMock()}>
      <FieldRowProvider {...services}>{children}</FieldRowProvider>
    </KibanaRootContextProvider>
  );
};

export const wrap = (
  component: JSX.Element,
  services: FieldInputServices = createFieldRowServicesMock()
) => <TestWrapper {...services}>{component}</TestWrapper>;
