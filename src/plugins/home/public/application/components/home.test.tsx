/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type { HomeProps } from './home';
import { Home } from './home';

import { FeatureCatalogueCategory } from '../../services';
import { Welcome } from './welcome';

let mockHasIntegrationsPermission = true;
jest.mock('../kibana_services', () => ({
  getServices: () => ({
    getBasePath: () => 'path',
    tutorialVariables: () => ({}),
    homeConfig: { disableWelcomeScreen: false },
    chrome: {
      setBreadcrumbs: () => {},
    },
    application: {
      capabilities: {
        navLinks: {
          integrations: mockHasIntegrationsPermission,
        },
      },
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  overviewPageActions: jest.fn().mockReturnValue([]),
  OverviewPageFooter: jest.fn().mockReturnValue(<></>),
  KibanaPageTemplate: jest.fn().mockReturnValue(<></>),
}));

describe('home', () => {
  let defaultProps: HomeProps;

  beforeEach(() => {
    mockHasIntegrationsPermission = true;
    defaultProps = {
      directories: [],
      solutions: [],
      localStorage: {
        ...localStorage,
        getItem: jest.fn((path) => {
          expect(path).toEqual('home:welcome:show');
          return null; // Simulate that the local item has not been set yet
        }),
        setItem: jest.fn(),
      },
      urlBasePath: 'goober',
      addBasePath(url) {
        return `base_path/${url}`;
      },
      hasUserDataView: jest.fn(async () => true),
    };
  });

  async function renderHome(props: Partial<HomeProps> = {}) {
    const component = shallow<Home>(<Home {...defaultProps} {...props} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));

    return component;
  }

  test('should render home component', async () => {
    const component = await renderHome();

    expect(component).toMatchSnapshot();
  });

  describe('directories', () => {
    test('should render solutions in the "solution section"', async () => {
      const solutionEntry1 = {
        id: 'kibana',
        title: 'Kibana',
        description: 'description',
        icon: 'logoKibana',
        path: 'kibana_landing_page',
        order: 1,
      };
      const solutionEntry2 = {
        id: 'solution-2',
        title: 'Solution two',
        description: 'description',
        icon: 'empty',
        path: 'path-to-solution-two',
        order: 2,
      };
      const solutionEntry3 = {
        id: 'solution-3',
        title: 'Solution three',
        description: 'description',
        icon: 'empty',
        path: 'path-to-solution-three',
        order: 3,
      };
      const solutionEntry4 = {
        id: 'solution-4',
        title: 'Solution four',
        description: 'description',
        icon: 'empty',
        path: 'path-to-solution-four',
        order: 4,
      };

      const component = await renderHome({
        solutions: [solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4],
      });

      expect(component).toMatchSnapshot();
    });

    test('should render ADMIN directory entry in "Manage your data" panel', async () => {
      const directoryEntry = {
        id: 'index_patterns',
        title: 'Index Patterns',
        description: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
        icon: 'indexPatternApp',
        path: 'index_management_landing_page',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });

    test('should not render directory entry when showOnHomePage is false', async () => {
      const directoryEntry = {
        id: 'stack-management',
        title: 'Management',
        description: 'Your center console for managing the Elastic Stack.',
        icon: 'managementApp',
        path: 'management_landing_page',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });
  });

  describe('change home route', () => {
    test('should render a link to change the default route in advanced settings if advanced settings is enabled', async () => {
      const component = await renderHome({
        directories: [
          {
            description: 'Change your settings',
            icon: 'gear',
            id: 'advanced_settings',
            path: 'path-to-advanced_settings',
            showOnHomePage: false,
            title: 'Advanced settings',
            category: FeatureCatalogueCategory.ADMIN,
          },
        ],
      });

      expect(component).toMatchSnapshot();
    });
  });

  describe('welcome', () => {
    test('should show the welcome screen if enabled, and there are no index patterns defined', async () => {
      defaultProps.localStorage.getItem = jest.fn(() => 'true');

      const hasUserDataView = jest.fn(async () => false);
      const component = await renderHome({ hasUserDataView });

      expect(defaultProps.localStorage.getItem).toHaveBeenCalledTimes(1);

      expect(component.find(Welcome).exists()).toBe(true);
    });

    test('stores skip welcome setting if skipped', async () => {
      defaultProps.localStorage.getItem = jest.fn(() => 'true');

      const hasUserDataView = jest.fn(async () => false);
      const component = await renderHome({ hasUserDataView });

      component.instance().skipWelcome();
      component.update();

      expect(defaultProps.localStorage.setItem).toHaveBeenCalledWith('home:welcome:show', 'false');

      expect(component.find(Welcome).exists()).toBe(false);
    });

    test('should show the normal home page if loading fails', async () => {
      defaultProps.localStorage.getItem = jest.fn(() => 'true');

      const hasUserDataView = jest.fn(() => Promise.reject('Doh!'));
      const component = await renderHome({ hasUserDataView });

      expect(component.find(Welcome).exists()).toBe(false);
    });

    test('should show the normal home page if welcome screen is disabled locally', async () => {
      defaultProps.localStorage.getItem = jest.fn(() => 'false');

      const component = await renderHome();

      expect(component.find(Welcome).exists()).toBe(false);
    });

    test("should show the normal home page if user doesn't have access to integrations", async () => {
      mockHasIntegrationsPermission = false;

      const component = await renderHome();

      expect(component.find(Welcome).exists()).toBe(false);
    });
  });

  describe('isNewKibanaInstance', () => {
    test('should set isNewKibanaInstance to true when there are no index patterns', async () => {
      const hasUserDataView = jest.fn(async () => false);
      const component = await renderHome({ hasUserDataView });

      expect(component.state().isNewKibanaInstance).toBe(true);

      expect(component).toMatchSnapshot();
    });

    test('should set isNewKibanaInstance to false when there are index patterns', async () => {
      const hasUserDataView = jest.fn(async () => true);
      const component = await renderHome({ hasUserDataView });

      expect(component.state().isNewKibanaInstance).toBe(false);

      expect(component).toMatchSnapshot();
    });

    test('should safely handle exceptions', async () => {
      const hasUserDataView = jest.fn(() => {
        throw new Error('simulated find error');
      });
      const component = await renderHome({ hasUserDataView });

      expect(component.state().isNewKibanaInstance).toBe(false);

      expect(component).toMatchSnapshot();
    });
  });
});
