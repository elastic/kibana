/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { setTimeout as setTimeoutP } from 'timers/promises';
import moment from 'moment';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { EuiLoadingSpinner } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { FeatureCatalogueCategory } from '@kbn/home-plugin/public';
import { AnalyticsNoDataPageKibanaProvider } from '@kbn/shared-ux-page-analytics-no-data';
import { hasESData, hasUserDataView } from './overview.test.mocks';
import { Overview } from './overview';

jest.mock('@kbn/shared-ux-page-kibana-template', () => {
  const MockedComponent: string = 'MockedKibanaPageTemplate';
  const mockedModule = {
    ...jest.requireActual('@kbn/shared-ux-page-kibana-template'),
    KibanaPageTemplate: () => {
      return <MockedComponent />;
    },
  };
  return mockedModule;
});

jest.mock('@kbn/shared-ux-page-analytics-no-data', () => {
  const MockedComponent: string = 'MockedAnalyticsNoDataPage';
  return {
    ...jest.requireActual('@kbn/shared-ux-page-analytics-no-data'),
    AnalyticsNoDataPageKibanaProvider: () => {
      return <MockedComponent />;
    },
  };
});

const mockNewsFetchResult = {
  error: null,
  feedItems: [
    {
      badge: null,
      description:
        'The official Go client now includes features like request retries and node discovery. Learn more about its architecture and package and repository layout.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: '8e18fcedbc',
      linkText: 'Read more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/the-go-client-for-elasticsearch-introduction?blade=kibanafeed',
      publishOn: moment('2020-08-31T10:23:47Z'),
      title: 'The Go client for Elasticsearch: Introduction',
    },
    {
      badge: null,
      description:
        'Learn how to use Elastic Uptime to configure alerting and anomaly detection for sites, services, and APIs.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'fb3e3d42ef',
      linkText: 'Read more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/alerting-and-anomaly-detection-for-uptime-and-reliability?blade=kibanafeed',
      publishOn: moment('2020-08-14T10:23:47Z'),
      title: 'Alerting and anomaly detection for uptime and reliability',
    },
    {
      badge: null,
      description:
        'Managing data using hot-warm architecture and ILM is a cost-effective way of retaining data — and a great way to easily keep your cloud costs down.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'b2fc7d47d5',
      linkText: 'Learn more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/optimizing-costs-elastic-cloud-hot-warm-index-lifecycle-management?blade=kibanafeed',
      publishOn: moment('2020-08-01T10:23:47Z'),
      title: 'Optimizing costs in Elastic Cloud: Hot-warm + index lifecycle management',
    },
  ],
  hasNew: true,
  kibanaVersion: '8.0.0',
};

const mockSolutions = [
  {
    id: 'kibana',
    title: 'Analytics',
    description: 'Description of Kibana',
    icon: 'logoKibana',
    path: 'kibana_landing_page',
    order: 1,
  },
  {
    id: 'solution-2',
    title: 'Solution two',
    description: 'Description of solution two',
    icon: 'empty',
    path: 'path-to-solution-two',
    order: 2,
  },
  {
    id: 'solution-3',
    title: 'Solution three',
    description: 'Description of solution three',
    icon: 'empty',
    path: 'path-to-solution-three',
    order: 3,
  },
  {
    id: 'solution-4',
    title: 'Solution four',
    description: 'Description of solution four',
    icon: 'empty',
    path: 'path-to-solution-four',
    order: 4,
  },
];

const mockFeatures = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Description of dashboard',
    icon: 'dashboardApp',
    path: 'dashboard_landing_page',
    showOnHomePage: false,
    category: 'data' as FeatureCatalogueCategory,
  },
  {
    id: 'discover',
    title: 'Discover',
    description: 'Description of discover',
    icon: 'discoverApp',
    path: 'discover_landing_page',
    showOnHomePage: false,
    category: 'data' as FeatureCatalogueCategory,
  },
  {
    id: 'canvas',
    title: 'Canvas',
    description: 'Description of canvas',
    icon: 'canvasApp',
    path: 'canvas_landing_page',
    showOnHomePage: false,
    category: 'data' as FeatureCatalogueCategory,
  },
];

const flushPromises = async () => await setTimeoutP(10);

const updateComponent = async (component: ReactWrapper) => {
  await act(async () => {
    await flushPromises();
    component.update();
  });
};

describe('Overview', () => {
  beforeEach(() => {
    hasESData.mockResolvedValue(true);
    hasUserDataView.mockResolvedValue(true);
  });

  afterAll(() => jest.clearAllMocks());

  test('renders correctly', async () => {
    const component = mountWithIntl(
      <Overview
        newsFetchResult={mockNewsFetchResult}
        solutions={mockSolutions}
        features={mockFeatures}
      />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
    expect(component.find(KibanaPageTemplate).length).toBe(1);
  });

  test('renders correctly without solutions', async () => {
    const component = mountWithIntl(
      <Overview newsFetchResult={mockNewsFetchResult} solutions={[]} features={mockFeatures} />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
  });

  test('renders correctly without features', async () => {
    const component = mountWithIntl(
      <Overview newsFetchResult={mockNewsFetchResult} solutions={mockSolutions} features={[]} />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
  });

  test('renders correctly when there is no user data view', async () => {
    hasESData.mockResolvedValue(true);
    hasUserDataView.mockResolvedValue(false);

    const component = mountWithIntl(
      <Overview
        newsFetchResult={mockNewsFetchResult}
        solutions={mockSolutions}
        features={mockFeatures}
      />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
    expect(component.find(AnalyticsNoDataPageKibanaProvider).length).toBe(1);
    expect(component.find(KibanaPageTemplate).length).toBe(0);
    expect(component.find(EuiLoadingSpinner).length).toBe(0);
  });

  test('show loading spinner during loading', async () => {
    hasESData.mockImplementation(() => new Promise(() => {}));
    hasUserDataView.mockImplementation(() => new Promise(() => {}));

    const component = mountWithIntl(
      <Overview
        newsFetchResult={mockNewsFetchResult}
        solutions={mockSolutions}
        features={mockFeatures}
      />
    );

    await updateComponent(component);

    expect(component.render()).toMatchSnapshot();
    expect(component.find(AnalyticsNoDataPageKibanaProvider).length).toBe(0);
    expect(component.find(KibanaPageTemplate).length).toBe(0);
    expect(component.find(EuiLoadingSpinner).length).toBe(1);
  });
});
