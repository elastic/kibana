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

import type { EnvironmentHealthResponse } from '../../../common/environment_health';
import {
  MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
  MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH,
} from '../../../common/environment_health';
import type { HttpFetchOptionsWithPath } from '@kbn/core/public';
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

const mockEnvironmentHealthResponse = (): EnvironmentHealthResponse => ({
  clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
  healthStatus: 'green',
  indicesCount: 12,
  dataStreamsCount: 3,
  attentionReasons: [],
});

const renderLandingPage = async (overrides: Partial<AppDependencies> = {}) => {
  const coreStart = overrides.coreStart ?? coreMock.createStart();
  jest.mocked(coreStart.http.get).mockImplementation((pathOrOptions: string | HttpFetchOptionsWithPath) => {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
    if (path === MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH) {
      return Promise.resolve(mockEnvironmentHealthResponse());
    }
    return Promise.resolve({});
  });
  const contextDependencies: AppDependencies = {
    appBasePath: 'http://localhost:9001',
    kibanaVersion: '8.10.0',
    cardsNavigationConfig: { enabled: true },
    sections: sectionsMock,
    chromeStyle: 'classic',
    coreStart,
    isAirGapped: false,
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

  // Component is rendered when either cards-navigation-page, managementLandingHeader (classic) or managementHomeSolution (project) is present
  const cardsNav = screen.queryByTestId('cards-navigation-page');
  const managementLandingHeader = screen.queryByTestId('managementLandingHeader');
  const managementHomeSolution = screen.queryByTestId('managementHomeSolution');
  expect(cardsNav || managementLandingHeader || managementHomeSolution).toBeTruthy();

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
      expect(screen.getByTestId('managementLandingHeader')).toBeInTheDocument();
    });
  });

  describe('Classic header environment', () => {
    test('Shows cluster title, status badge, and stats in page header when cards navigation is disabled', async () => {
      const coreStart = coreMock.createStart();
      await renderLandingPage({ cardsNavigationConfig: { enabled: false }, coreStart });
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: new RegExp(MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME),
        })
      ).toBeInTheDocument();
      expect(screen.getByTestId('managementEnvHealthClusterStatus')).toHaveTextContent('green');
      expect(screen.getByTestId('managementEnvHealthIndices')).toHaveTextContent('12');
      expect(coreStart.chrome.docTitle.change).toHaveBeenLastCalledWith(
        MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME
      );
    });

    test('Shows Stack Management in page title when cluster name is unavailable', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockImplementation((pathOrOptions: string | HttpFetchOptionsWithPath) => {
        const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
        if (path === MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH) {
          return Promise.resolve({
            ...mockEnvironmentHealthResponse(),
            clusterName: undefined,
          });
        }
        return Promise.resolve({});
      });
      const contextDependencies: AppDependencies = {
        appBasePath: 'http://localhost:9001',
        kibanaVersion: '8.10.0',
        cardsNavigationConfig: { enabled: false },
        sections: sectionsMock,
        chromeStyle: 'classic',
        coreStart,
        isAirGapped: false,
        getAutoOpsStatusHook: () => () => ({ isCloudConnectAutoopsEnabled: false, isLoading: false }),
      };
      render(
        <I18nProvider>
          <MemoryRouter initialEntries={['/management_landing']}>
            <AppContextProvider value={contextDependencies}>
              <ManagementLandingPage setBreadcrumbs={jest.fn()} onAppMounted={jest.fn()} />
            </AppContextProvider>
          </MemoryRouter>
        </I18nProvider>
      );
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(
        screen.getByRole('heading', { level: 1, name: /stack management/i })
      ).toBeInTheDocument();
      expect(coreStart.chrome.docTitle.change).toHaveBeenLastCalledWith('Stack Management');
    });

    test('Does not load classic header environment widgets when cards navigation is enabled', async () => {
      await renderLandingPage({ cardsNavigationConfig: { enabled: true } });
      expect(screen.queryByTestId('managementEnvHealthIndices')).not.toBeInTheDocument();
      expect(screen.queryByTestId('managementLandingHeader')).not.toBeInTheDocument();
    });
  });

  describe('Empty prompt', () => {
    test('Renders landing header when chromeStyle is "classic"', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
      });

      expect(screen.getByTestId('managementLandingHeader')).toBeInTheDocument();
    });

    test('Renders the solution empty prompt when chromeStyle is "project"', async () => {
      await renderLandingPage({
        chromeStyle: 'project',
        cardsNavigationConfig: { enabled: false },
      });

      expect(screen.queryByTestId('managementLandingHeader')).not.toBeInTheDocument();
      expect(screen.getByTestId('managementHomeSolution')).toBeInTheDocument();
    });
  });

  describe('AutoOps Promotion Callout', () => {
    test('Shows AutoOps callout when not in cloud', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: false },
      });

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
    });

    test('Hides AutoOps callout when in cloud environment', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: true },
      });

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('Shows AutoOps callout when cloud service is not available', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        // cloud service not provided - defaults to isCloudEnabled: false
      });

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
    });

    test('Hides AutoOps callout when in air-gapped environment', async () => {
      await renderLandingPage({
        chromeStyle: 'classic',
        cardsNavigationConfig: { enabled: false },
        cloud: { isCloudEnabled: false },
        isAirGapped: true,
      });

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });
  });
});
