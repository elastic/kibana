/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';

import { AppContextProvider } from '../management_app/management_context';
import { ManagementLandingPage } from './landing';
import type { AppDependencies } from '../../types';

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

const sectionsMock = [
  {
    id: 'data',
    title: 'Data',
    apps: [
      {
        id: 'ingest_pipelines',
        title: 'Ingest pipelines',
        enabled: true,
        basePath: '/app/management/ingest/pipelines',
      },
    ],
  },
] as AppDependencies['sections'];

const renderLandingPage = async (overrides: Partial<AppDependencies> = {}) => {
  const coreStart = coreMock.createStart();
  const contextDependencies: AppDependencies = {
    appBasePath: 'http://localhost:9001',
    kibanaVersion: '8.10.0',
    cardsNavigationConfig: { enabled: true },
    sections: sectionsMock,
    chromeStyle: 'classic',
    coreStart,
    hasEnterpriseLicense: false,
    getAutoOpsStatusHook: () => () => ({ isCloudConnectAutoopsEnabled: false, isLoading: false }),
    ...overrides,
  };

  const result = render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/management_landing']}>
        <AppContextProvider value={contextDependencies}>
          <ManagementLandingPage setBreadcrumbs={jest.fn()} onAppMounted={jest.fn()} />
        </AppContextProvider>
      </MemoryRouter>
    </I18nProvider>
  );

  // Wait for async rendering
  await act(async () => {
    await jest.runAllTimersAsync();
  });

  // Component is rendered when either cards-navigation-page, managementHome (classic) or managementHomeSolution (project) is present
  const cardsNav = screen.queryByTestId('cards-navigation-page');
  const managementHome = screen.queryByTestId('managementHome');
  const managementHomeSolution = screen.queryByTestId('managementHomeSolution');
  expect(cardsNav || managementHome || managementHomeSolution).toBeTruthy();

  return result;
};

describe('Landing Page', () => {
  describe('Can be configured through cardsNavigationConfig', () => {
    test('Shows cards navigation when feature is enabled', async () => {
      await renderLandingPage();
      expect(screen.getByTestId('cards-navigation-page')).toBeInTheDocument();
    });

    test('Hide cards navigation when feature is disabled', async () => {
      await renderLandingPage({ cardsNavigationConfig: { enabled: false } });

      expect(screen.queryByTestId('cards-navigation-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('managementHome')).toBeInTheDocument();
    });
  });

  describe('Empty prompt', () => {
    test('Renders the default empty prompt when chromeStyle is "classic"', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
      });

      expect(screen.getByTestId('managementHome')).toBeInTheDocument();
    });

    test('Renders the solution empty prompt when chromeStyle is "project"', async () => {
      await renderLandingPage({
        chromeStyle: 'project',
        cardsNavigationConfig: { enabled: false },
      });

      expect(screen.queryByTestId('managementHome')).not.toBeInTheDocument();
      expect(screen.getByTestId('managementHomeSolution')).toBeInTheDocument();
    });
  });

  describe('AutoOps Promotion Callout', () => {
    test('Shows AutoOps callout when not in cloud and has enterprise license', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: false },
        hasEnterpriseLicense: true,
      });

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
    });

    test('Hides AutoOps callout when in cloud environment', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: true },
        hasEnterpriseLicense: true,
      });

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('Hides AutoOps callout when not having enterprise license', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: false },
        hasEnterpriseLicense: false,
      });

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('Hides AutoOps callout when in cloud and without enterprise license', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: true },
        hasEnterpriseLicense: false,
      });

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('Shows AutoOps callout when cloud service is not available but has enterprise license', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        hasEnterpriseLicense: true,
        // cloud service not provided - defaults to isCloudEnabled: false
      });

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
    });
  });
});
