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
import { userEvent } from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';
import type { HomeProps } from './home';
import { Home } from './home';

let mockHasIntegrationsPermission = true;
const mockNavigateToUrl = jest.fn();
const mockSetBreadcrumbs = jest.fn();
const mockTrackUiMetric = jest.fn();
const mockWelcomeOnRendered = jest.fn();

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    getBasePath: () => 'path',
    tutorialVariables: () => ({}),
    homeConfig: { disableWelcomeScreen: false },
    chrome: {
      setBreadcrumbs: mockSetBreadcrumbs,
    },
    application: {
      navigateToUrl: mockNavigateToUrl,
      navigateToApp: jest.fn(),
      capabilities: {
        navLinks: {
          integrations: mockHasIntegrationsPermission,
        },
      },
    },
    trackUiMetric: mockTrackUiMetric,
    welcomeService: {
      onRendered: mockWelcomeOnRendered,
      renderTelemetryNotice: () => null,
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  OverviewPageFooter: () => <div data-test-subj="overviewPageFooter" />,
}));

jest.mock('@kbn/shared-ux-page-kibana-template', () => ({
  KibanaPageTemplate: ({
    children,
    ...rest
  }: {
    children?: React.ReactNode;
    'data-test-subj'?: string;
  }) => <div data-test-subj={rest['data-test-subj']}>{children}</div>,
}));

jest.mock('./add_data', () => ({
  AddData: () => <div data-test-subj="addData" />,
}));

jest.mock('./manage_data', () => ({
  ManageData: ({ features }: { features: Array<{ id: string }> }) => (
    <div data-test-subj="manageData">
      {features.map((feature) => (
        <div key={feature.id} data-test-subj={`manage-feature-${feature.id}`} />
      ))}
    </div>
  ),
}));

jest.mock('./solutions_section', () => ({
  SolutionsSection: ({ solutions }: { solutions: Array<{ id: string; title: string }> }) => (
    <div data-test-subj="solutionsSection">
      {solutions.map((solution) => (
        <div key={solution.id} data-test-subj={`solution-${solution.id}`}>
          {solution.title}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('./sample_data', () => ({
  SampleDataCard: ({ onDecline }: { onDecline: () => void }) => (
    <button type="button" data-test-subj="skipWelcomeScreen" onClick={onDecline}>
      Explore on my own
    </button>
  ),
}));

const createSolution = (
  overrides: Partial<FeatureCatalogueSolution> & Pick<FeatureCatalogueSolution, 'id' | 'title'>
): FeatureCatalogueSolution => ({
  description: 'description',
  icon: 'empty',
  path: `path-to-${overrides.id}`,
  order: 1,
  ...overrides,
});

const createDirectory = (
  overrides: Partial<FeatureCatalogueEntry> & Pick<FeatureCatalogueEntry, 'id' | 'title'>
): FeatureCatalogueEntry => ({
  description: 'description',
  icon: 'empty',
  path: `path-to-${overrides.id}`,
  showOnHomePage: true,
  category: 'admin',
  ...overrides,
});

describe('home', () => {
  let defaultProps: HomeProps;

  beforeEach(() => {
    mockHasIntegrationsPermission = true;
    mockSetBreadcrumbs.mockClear();
    mockTrackUiMetric.mockClear();
    mockWelcomeOnRendered.mockClear();
    defaultProps = {
      directories: [],
      solutions: [],
      localStorage: {
        ...localStorage,
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
      },
      urlBasePath: 'goober',
      addBasePath(url) {
        return `base_path/${url}`;
      },
      hasUserDataView: jest.fn(async () => true),
      isCloudEnabled: false,
    };
  });

  const renderHome = (props: Partial<HomeProps> = {}) => {
    return render(
      <I18nProvider>
        <EuiProvider>
          <MockAppHeaderProvider>
            <Home {...defaultProps} {...props} />
          </MockAppHeaderProvider>
        </EuiProvider>
      </I18nProvider>
    );
  };

  const expectHomePage = async () => {
    expect(await screen.findByTestId('homeApp')).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Welcome home');
    expect(screen.queryByTestId('homeWelcomeInterstitial')).not.toBeInTheDocument();
  };

  const expectWelcomeScreen = async () => {
    expect(await screen.findByTestId('homeWelcomeInterstitial')).toBeInTheDocument();
    expect(screen.queryByTestId('homeApp')).not.toBeInTheDocument();
  };

  describe('normal home page', () => {
    test('renders the AppHeader title and page sections', async () => {
      renderHome();

      await expectHomePage();
      expect(screen.getByTestId('solutionsSection')).toBeInTheDocument();
      expect(screen.getByTestId('addData')).toBeInTheDocument();
      expect(screen.getByTestId('manageData')).toBeInTheDocument();
      expect(screen.getByTestId('overviewPageFooter')).toBeInTheDocument();
    });

    test('renders solutions in the solutions section', async () => {
      renderHome({
        solutions: [
          createSolution({ id: 'kibana', title: 'Kibana', icon: 'logoKibana', order: 1 }),
          createSolution({ id: 'solution-2', title: 'Solution two', order: 2 }),
        ],
      });

      await expectHomePage();
      expect(screen.getByTestId('solution-kibana')).toHaveTextContent('Kibana');
      expect(screen.getByTestId('solution-solution-2')).toHaveTextContent('Solution two');
    });

    test('renders admin directory entries in the manage data section', async () => {
      renderHome({
        directories: [
          createDirectory({
            id: 'index_patterns',
            title: 'Index Patterns',
            showOnHomePage: true,
            category: 'admin',
          }),
        ],
      });

      await expectHomePage();
      expect(screen.getByTestId('manage-feature-index_patterns')).toBeInTheDocument();
    });

    test('does not render directory entries when showOnHomePage is false', async () => {
      renderHome({
        directories: [
          createDirectory({
            id: 'stack-management',
            title: 'Management',
            showOnHomePage: false,
            category: 'admin',
          }),
        ],
      });

      await expectHomePage();
      expect(screen.queryByTestId('manage-feature-stack-management')).not.toBeInTheDocument();
    });

    test('falls back to console in manage data when no admin features are available', async () => {
      renderHome({
        directories: [
          createDirectory({
            id: 'console',
            title: 'Console',
            showOnHomePage: false,
            category: 'other',
          }),
        ],
      });

      await expectHomePage();
      expect(screen.getByTestId('manage-feature-console')).toBeInTheDocument();
    });
  });

  describe('welcome', () => {
    test('shows the welcome screen when enabled and there are no data views', async () => {
      defaultProps.localStorage.getItem = jest.fn().mockReturnValue('true');

      renderHome({ hasUserDataView: jest.fn(async () => false) });

      await expectWelcomeScreen();
      expect(defaultProps.localStorage.getItem).toHaveBeenCalledWith('home:welcome:show');
    });

    test('stores skip welcome setting and shows the home page when skipped', async () => {
      const user = userEvent.setup();
      defaultProps.localStorage.getItem = jest.fn().mockReturnValue('true');

      renderHome({ hasUserDataView: jest.fn(async () => false) });

      await expectWelcomeScreen();
      await user.click(screen.getByTestId('skipWelcomeScreen'));

      await expectHomePage();
      expect(defaultProps.localStorage.setItem).toHaveBeenCalledWith('home:welcome:show', 'false');
    });

    test('shows the normal home page if loading fails', async () => {
      defaultProps.localStorage.getItem = jest.fn().mockReturnValue('true');

      renderHome({ hasUserDataView: jest.fn(() => Promise.reject(new Error('Doh!'))) });

      await expectHomePage();
    });

    test('shows the normal home page if welcome screen is disabled locally', async () => {
      defaultProps.localStorage.getItem = jest.fn().mockReturnValue('false');

      renderHome({ hasUserDataView: jest.fn(async () => false) });

      await expectHomePage();
    });

    test("shows the normal home page if the user doesn't have access to integrations", async () => {
      mockHasIntegrationsPermission = false;

      renderHome({ hasUserDataView: jest.fn(async () => false) });

      await expectHomePage();
    });
  });

  describe('isNewKibanaInstance', () => {
    test('shows welcome when there are no data views', async () => {
      renderHome({ hasUserDataView: jest.fn(async () => false) });

      await expectWelcomeScreen();
    });

    test('shows the home page when there are data views', async () => {
      renderHome({ hasUserDataView: jest.fn(async () => true) });

      await expectHomePage();
    });

    test('shows the home page when checking for data views throws', async () => {
      renderHome({
        hasUserDataView: jest.fn(() => {
          throw new Error('simulated find error');
        }),
      });

      await expectHomePage();
    });
  });

  describe('breadcrumbs', () => {
    test('sets breadcrumbs to Home on mount', async () => {
      renderHome();

      await expectHomePage();
      expect(mockSetBreadcrumbs).toHaveBeenCalledWith([{ text: 'Home' }]);
    });
  });
});
