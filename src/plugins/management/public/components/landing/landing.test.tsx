/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { merge } from 'lodash';
import { registerTestBed, AsyncTestBedConfig, TestBed } from '@kbn/test-jest-helpers';

import { AppContextProvider } from '../management_app/management_context';
import { ManagementLandingPage } from './landing';

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
];

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/management_landing`],
    componentRoutePath: '/management_landing',
  },
  doMountAsync: true,
};

export const WithAppDependencies =
  (Comp: any, overrides: Record<string, unknown> = {}) =>
  (props: Record<string, unknown>) => {
    const contextDependencies = {
      appBasePath: 'http://localhost:9001',
      kibanaVersion: '8.10.0',
      cardsNavigationConfig: { enabled: true },
      sections: sectionsMock,
    };

    return (
      // @ts-ignore
      <AppContextProvider value={merge(contextDependencies, overrides)}>
        <Comp {...props} setBreadcrumbs={jest.fn()} onAppMounted={jest.fn()} />
      </AppContextProvider>
    );
  };

export const setupLandingPage = async (overrides?: Record<string, unknown>): Promise<TestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(ManagementLandingPage, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
  };
};

describe('Landing Page', () => {
  let testBed: TestBed;

  describe('Can be configured through cardsNavigationConfig', () => {
    beforeEach(async () => {
      testBed = await setupLandingPage();
    });

    test('Shows cards navigation when feature is enabled', async () => {
      const { exists } = testBed;
      expect(exists('cards-navigation-page')).toBe(true);
    });

    test('Hide cards navigation when feature is disabled', async () => {
      testBed = await setupLandingPage({ cardsNavigationConfig: { enabled: false } });
      const { exists } = testBed;

      expect(exists('cards-navigation-page')).toBe(false);
      expect(exists('managementHome')).toBe(true);
    });
  });
});
