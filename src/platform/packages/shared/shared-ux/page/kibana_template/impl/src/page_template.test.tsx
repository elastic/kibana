/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { NoDataCardProvider } from '@kbn/shared-ux-card-no-data';
import { getNoDataCardServicesMock } from '@kbn/shared-ux-card-no-data-mocks';

import { KibanaPageTemplate } from './page_template';

const items: SolutionNavProps['items'] = [
  {
    name: 'Ingest',
    id: '1',
    items: [
      {
        name: 'Ingest Node Pipelines',
        id: '1.1',
      },
      {
        name: 'Logstash Pipelines',
        id: '1.2',
      },
      {
        name: 'Beats Central Management',
        id: '1.3',
      },
    ],
  },
  {
    name: 'Data',
    id: '2',
    items: [
      {
        name: 'Index Management',
        id: '2.1',
      },
      {
        name: 'Index Lifecycle Policies',
        id: '2.2',
      },
      {
        name: 'Snapshot and Restore',
        id: '2.3',
      },
    ],
  },
];

const solutionNav = {
  name: 'Kibana',
  icon: 'logoKibana',
  items,
};

const noDataConfig: NoDataPageProps = {
  action: {
    elasticAgent: {
      href: '/app/integrations',
    },
  },
};

describe('KibanaPageTemplate', () => {
  test('renders noDataConfig with solutionNav', () => {
    renderWithI18n(
      <NoDataCardProvider {...getNoDataCardServicesMock()}>
        <KibanaPageTemplate
          noDataConfig={noDataConfig}
          solutionNav={solutionNav}
          data-test-subj="noDataConfigPageWithSolutionNavBar"
        />
      </NoDataCardProvider>
    );

    expect(screen.getByTestId('noDataConfigPageWithSolutionNavBar')).toBeInTheDocument();
  });

  test('renders noDataConfig without solutionNav', () => {
    renderWithI18n(
      <NoDataCardProvider {...getNoDataCardServicesMock()}>
        <KibanaPageTemplate noDataConfig={noDataConfig} data-test-subj="noDataConfigPage" />
      </NoDataCardProvider>
    );

    expect(screen.getByTestId('noDataConfigPage')).toBeInTheDocument();
  });

  test('renders template with solutionNav but no noDataConfig', () => {
    renderWithI18n(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          pageTitle: 'Test Page',
          description: 'Test description',
          rightSideItems: [<div key="test">test</div>],
        }}
        solutionNav={solutionNav}
        data-test-subj="testPageTemplate"
      >
        <div>Child element</div>
      </KibanaPageTemplate>
    );

    // Should render the solution nav
    expect(screen.getByText('Kibana')).toBeInTheDocument();
    expect(screen.getByText('Child element')).toBeInTheDocument();
    expect(screen.getByTestId('testPageTemplate')).toBeInTheDocument();
  });
});
