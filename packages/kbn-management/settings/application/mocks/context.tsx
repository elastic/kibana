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

import { createFormServicesMock } from '@kbn/management-settings-components-form/mocks';
import { Subscription } from 'rxjs';
import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';
import { SettingsApplicationProvider, SettingsApplicationServices } from '../services';

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

export const createSettingsApplicationServicesMock = (): SettingsApplicationServices => ({
  ...createFormServicesMock(),
  getAllowlistedSettings: () => getSettingsMock(),
  isCustomSetting: () => false,
  isOverriddenSetting: () => false,
  subscribeToUpdates: () => new Subscription(),
  addUrlToHistory: jest.fn(),
});

export const TestWrapper = ({
  children,
  services = createSettingsApplicationServicesMock(),
}: {
  children: ReactChild;
  services?: SettingsApplicationServices;
}) => {
  return (
    <KibanaRootContextProvider {...createRootMock()}>
      <SettingsApplicationProvider {...services}>{children}</SettingsApplicationProvider>
    </KibanaRootContextProvider>
  );
};

export const wrap = (
  component: JSX.Element,
  services: SettingsApplicationServices = createSettingsApplicationServicesMock()
) => <TestWrapper services={services} children={component} />;
