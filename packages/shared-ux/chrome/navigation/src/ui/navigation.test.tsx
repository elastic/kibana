/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { getServicesMock } from '../../mocks/src/jest';
import { PlatformConfigSet, SolutionProperties } from '../../types';
import { Platform } from '../model';
import { NavigationProvider } from '../services';
import { Navigation } from './navigation';

describe('<Navigation />', () => {
  const services = getServicesMock();

  const homeHref = '#';
  let platformSections: PlatformConfigSet | undefined;
  let solutions: SolutionProperties[];

  beforeEach(() => {
    platformSections = { analytics: {}, ml: {}, devTools: {}, management: {} };
    solutions = [{ id: 'navigation_testing', name: 'Navigation testing', icon: 'gear' }];
  });

  test('renders the header logo and top-level navigation buckets', async () => {
    const { findByTestId, findByText } = render(
      <NavigationProvider {...services} navIsOpen={true}>
        <Navigation platformConfig={platformSections} solutions={solutions} homeHref={homeHref} />
      </NavigationProvider>
    );

    expect(await findByText('Navigation testing')).toBeVisible();

    expect(await findByTestId('nav-header-logo')).toBeVisible();
    expect(await findByTestId('nav-bucket-navigation_testing')).toBeVisible();
    expect(await findByTestId('nav-bucket-analytics')).toBeVisible();
    expect(await findByTestId('nav-bucket-ml')).toBeVisible();
    expect(await findByTestId('nav-bucket-devTools')).toBeVisible();
    expect(await findByTestId('nav-bucket-management')).toBeVisible();
  });

  test('includes link to deployments', async () => {
    const { findByText } = render(
      <NavigationProvider {...services} navIsOpen={true}>
        <Navigation
          platformConfig={platformSections}
          solutions={solutions}
          homeHref={homeHref}
          linkToCloud="deployments"
        />
      </NavigationProvider>
    );

    expect(await findByText('My deployments')).toBeVisible();
  });

  test('platform links can be disabled', async () => {
    platformSections = {
      [Platform.Analytics]: { enabled: false },
      [Platform.MachineLearning]: { enabled: false },
      [Platform.DevTools]: { enabled: false },
      [Platform.Management]: { enabled: false },
    };

    const { findByTestId, queryByTestId } = render(
      <NavigationProvider {...services} navIsOpen={true}>
        <Navigation platformConfig={platformSections} solutions={solutions} homeHref={homeHref} />
      </NavigationProvider>
    );

    expect(await findByTestId('nav-header-logo')).toBeVisible();
    expect(queryByTestId('nav-bucket-analytics')).not.toBeInTheDocument();
    expect(queryByTestId('nav-bucket-ml')).not.toBeInTheDocument();
    expect(queryByTestId('nav-bucket-devTools')).not.toBeInTheDocument();
    expect(queryByTestId('nav-bucket-management')).not.toBeInTheDocument();
  });

  test('sets the specified nav item to active', async () => {
    solutions[0].items = [
      {
        id: 'root',
        name: '',
        items: [
          {
            id: 'city',
            name: 'City',
          },
          {
            id: 'town',
            name: 'Town',
          },
        ],
      },
    ];

    const { findByTestId } = render(
      <NavigationProvider {...services} navIsOpen={true}>
        <Navigation
          platformConfig={platformSections}
          solutions={solutions}
          homeHref={homeHref}
          activeNavItemId="navigation_testing.root.city"
        />
      </NavigationProvider>
    );

    const label = await findByTestId('nav-item-navigation_testing.root.city-selected');
    expect(label).toHaveTextContent('City');
    expect(label).toBeVisible();
  });

  test('shows loading state', async () => {
    services.loadingCount = 5;

    const { findByTestId } = render(
      <NavigationProvider {...services} navIsOpen={true}>
        <Navigation platformConfig={platformSections} solutions={solutions} homeHref={homeHref} />
      </NavigationProvider>
    );

    expect(await findByTestId('nav-header-loading-spinner')).toBeVisible();
  });
});
