/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import moment from 'moment';
import { render, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { FeatureCatalogueCategory } from '@kbn/home-plugin/public';
import { hasESData, hasUserDataView } from './overview.test.mocks';
import { Overview } from './overview';

jest.mock('@kbn/shared-ux-page-kibana-template', () => {
  const MockTemplate = ({ children }: { children?: ReactNode }) => (
    <div data-test-subj="mockedKibanaPageTemplate">{children}</div>
  );
  MockTemplate.Section = ({ children }: { children?: ReactNode }) => <section>{children}</section>;

  return {
    ...jest.requireActual('@kbn/shared-ux-page-kibana-template'),
    KibanaPageTemplate: MockTemplate,
  };
});

jest.mock('@kbn/shared-ux-page-analytics-no-data', () => {
  const MockedComponent = () => 'MockedAnalyticsNoDataPage';
  return {
    ...jest.requireActual('@kbn/shared-ux-page-analytics-no-data'),
    AnalyticsNoDataPageKibanaProvider: () => {
      return <MockedComponent />;
    },
  };
});

jest.mock('../news_feed', () => ({
  NewsFeed: () => <div data-test-subj="mockedNewsFeed" />,
}));

jest.mock('../add_data', () => ({
  AddData: () => <div data-test-subj="mockedAddData" />,
}));

jest.mock('../manage_data', () => ({
  ManageData: () => <div data-test-subj="mockedManageData" />,
}));

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
  {
    id: 'index_patterns',
    title: 'Index Patterns',
    description: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
    icon: 'indexPatternApp',
    path: 'index_management_landing_page',
    showOnHomePage: true,
    category: 'admin' as FeatureCatalogueCategory,
  },
  {
    id: 'console',
    title: 'Console',
    description: 'Skip the UI and manipulate Elasticsearch directly',
    icon: 'consoleApp',
    path: '/app/dev_tools#/console',
    showOnHomePage: false,
    category: 'admin' as FeatureCatalogueCategory,
  },
];

const renderOverview = (
  props: Partial<React.ComponentProps<typeof Overview>> = {}
): ReturnType<typeof render> =>
  render(
    <EuiProvider>
      <I18nProvider>
        <MockAppHeaderProvider>
          <Overview
            newsFetchResult={mockNewsFetchResult}
            solutions={mockSolutions}
            features={mockFeatures}
            {...props}
          />
        </MockAppHeaderProvider>
      </I18nProvider>
    </EuiProvider>
  );

describe('Overview', () => {
  beforeEach(() => {
    hasESData.mockResolvedValue(true);
    hasUserDataView.mockResolvedValue(true);
  });

  afterAll(() => jest.clearAllMocks());

  test('renders the Analytics app header', async () => {
    const { getByTestId } = renderOverview();

    await waitFor(() => {
      expect(getByTestId('mockedKibanaPageTemplate')).toBeInTheDocument();
    });

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Analytics');
  });

  test('renders manage and dev tools in the app header menu', async () => {
    const { getByTestId } = renderOverview();

    await waitFor(() => {
      expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });

    await openAppMenuOverflow();

    expect(getByTestId('homeManage')).toHaveAttribute(
      'href',
      expect.stringContaining('/app/management')
    );
    expect(getByTestId('homeDevTools')).toHaveAttribute(
      'href',
      expect.stringContaining('/app/dev_tools')
    );
  });

  test('renders correctly without solutions', async () => {
    const { getByTestId } = renderOverview({ solutions: [] });

    await waitFor(() => {
      expect(getByTestId('mockedKibanaPageTemplate')).toBeInTheDocument();
    });

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Analytics');
  });

  test('hides dev tools when the console feature is missing', async () => {
    const { getByTestId, queryByTestId } = renderOverview({ features: [] });

    await waitFor(() => {
      expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });

    await openAppMenuOverflow();

    expect(getByTestId('homeManage')).toBeInTheDocument();
    expect(queryByTestId('homeDevTools')).not.toBeInTheDocument();
  });

  test('renders correctly when there is no user data view', async () => {
    hasESData.mockResolvedValue(true);
    hasUserDataView.mockResolvedValue(false);

    const { getByText, queryByTestId, queryByLabelText } = renderOverview();

    await waitFor(() => {
      expect(getByText('MockedAnalyticsNoDataPage')).toBeInTheDocument();
    });

    expect(queryByTestId('mockedKibanaPageTemplate')).not.toBeInTheDocument();
    expect(queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  test('show loading spinner during loading', async () => {
    hasESData.mockImplementation(() => new Promise(() => {}));
    hasUserDataView.mockImplementation(() => new Promise(() => {}));

    const { getByLabelText, queryByText, queryByTestId } = renderOverview();

    await waitFor(() => {
      expect(getByLabelText('Loading')).toBeInTheDocument();
    });

    expect(queryByText('MockedAnalyticsNoDataPage')).not.toBeInTheDocument();
    expect(queryByTestId('mockedKibanaPageTemplate')).not.toBeInTheDocument();
  });
});
