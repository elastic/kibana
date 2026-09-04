/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import type { AddDataTab } from '../../services/add_data/add_data_service';
import type { TutorialDirectoryHeaderLinkComponent } from '../../services/tutorials/tutorial_service';
import { TutorialDirectory } from './tutorial_directory';

const mockSetBreadcrumbs = jest.fn();
const mockHistoryPush = jest.fn();
const mockGetAddDataTabs = jest.fn<AddDataTab[], []>(() => []);
const mockGetDirectoryHeaderLinks = jest.fn<TutorialDirectoryHeaderLinkComponent[], []>(() => []);
const mockGetUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
);
const mockAddBasePath = jest.fn((url: string) => url);

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    addDataService: {
      getAddDataTabs: mockGetAddDataTabs,
    },
    tutorialService: {
      getDirectoryHeaderLinks: mockGetDirectoryHeaderLinks,
    },
    chrome: {
      setBreadcrumbs: mockSetBreadcrumbs,
    },
    application: {
      getUrlForApp: mockGetUrlForApp,
    },
    history: {
      push: mockHistoryPush,
      location: { hash: '#/tutorial_directory/sampleData' },
    },
  }),
}));

jest.mock('../load_tutorials', () => ({
  getTutorials: jest.fn(async () => []),
}));

jest.mock('@kbn/home-sample-data-tab', () => ({
  SampleDataTab: () => <div data-test-subj="sampleDataTab" />,
}));

describe('TutorialDirectory', () => {
  beforeEach(() => {
    mockSetBreadcrumbs.mockClear();
    mockHistoryPush.mockClear();
    mockGetAddDataTabs.mockReturnValue([]);
    mockGetDirectoryHeaderLinks.mockReturnValue([]);
  });

  const renderDirectory = (openTab = 'sampleData') => {
    return render(
      <I18nProvider>
        <EuiProvider>
          <MockAppHeaderProvider>
            <TutorialDirectory
              addBasePath={mockAddBasePath}
              openTab={openTab}
              isCloudEnabled={false}
            />
          </MockAppHeaderProvider>
        </EuiProvider>
      </I18nProvider>
    );
  };

  it('renders the AppHeader title, description, and Integrations back link', async () => {
    renderDirectory();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Add data');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Try our sample data or upload your own data.'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/integrations/browse'
    );
  });

  it('selects the Sample data tab and renders its content', async () => {
    renderDirectory();

    expect(await screen.findByTestId('homeTab-sampleData')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('sampleDataTab')).toBeInTheDocument();
  });

  it('does not wrap null directory header links in a flex group', async () => {
    mockGetDirectoryHeaderLinks.mockReturnValue([() => null]);

    const { container } = renderDirectory();
    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title);

    expect(container.querySelector('.euiFlexGroup')).toBeNull();
  });

  it('renders extra add-data tabs from the add data service', async () => {
    mockGetAddDataTabs.mockReturnValue([
      {
        id: 'fileDataViz',
        name: 'Upload file',
        getComponent: () => <div data-test-subj="uploadFileTab" />,
      },
    ]);

    renderDirectory('fileDataViz');

    expect(await screen.findByTestId('homeTab-fileDataViz')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('uploadFileTab')).toBeInTheDocument();
  });
});
