/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { Home } from './home';

import { FeatureCatalogueCategory } from '../../services';

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    getBasePath: () => 'path',
    tutorialVariables: () => ({}),
    homeConfig: { disableWelcomeScreen: false },
    chrome: {
      setBreadcrumbs: () => {},
    },
  }),
}));

describe('home', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      directories: [],
      solutions: [],
      apmUiEnabled: true,
      mlEnabled: true,
      kibanaVersion: '99.2.1',
      fetchTelemetry: jest.fn(),
      getTelemetryBannerId: jest.fn(),
      setOptIn: jest.fn(),
      showTelemetryOptIn: false,
      addBasePath(url) {
        return `base_path/${url}`;
      },
      find() {
        return Promise.resolve({ total: 1 });
      },
      loadingCount: {
        increment: sinon.mock(),
        decrement: sinon.mock(),
      },
      localStorage: {
        getItem: sinon.spy((path) => {
          expect(path).toEqual('home:welcome:show');
          return 'false';
        }),
        setItem: sinon.mock(),
      },
      urlBasePath: 'goober',
      onOptInSeen() {
        return false;
      },
      getOptInStatus: jest.fn(),
    };
  });

  async function renderHome(props = {}) {
    const component = shallow(<Home {...defaultProps} {...props} />);

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

  describe('header', () => {
    test('render', async () => {
      const component = await renderHome();
      expect(component).toMatchSnapshot();
    });

    test('should show "Manage" link if stack management is available', async () => {
      const directoryEntry = {
        id: 'stack-management',
        title: 'Management',
        description: 'Your center console for managing the Elastic Stack.',
        icon: 'managementApp',
        path: 'management_landing_page',
        category: FeatureCatalogueCategory.ADMIN,
        showOnHomePage: false,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });

    test('should show "Dev tools" link if console is available', async () => {
      const directoryEntry = {
        id: 'console',
        title: 'Console',
        description: 'Skip cURL and use a JSON interface to work with your data in Console.',
        icon: 'consoleApp',
        path: 'path-to-dev-tools',
        category: FeatureCatalogueCategory.ADMIN,
        showOnHomePage: false,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });
  });

  describe('directories', () => {
    test('should render solutions in the "solution section"', async () => {
      const solutionEntry1 = {
        id: 'kibana',
        title: 'Kibana',
        subtitle: 'Visualize & analyze',
        descriptions: ['Analyze data in dashboards'],
        icon: 'logoKibana',
        path: 'kibana_landing_page',
        order: 1,
      };
      const solutionEntry2 = {
        id: 'solution-2',
        title: 'Solution two',
        subtitle: 'Subtitle for solution two',
        descriptions: ['Example use case'],
        icon: 'empty',
        path: 'path-to-solution-two',
        order: 2,
      };
      const solutionEntry3 = {
        id: 'solution-3',
        title: 'Solution three',
        subtitle: 'Subtitle for solution three',
        descriptions: ['Example use case'],
        icon: 'empty',
        path: 'path-to-solution-three',
        order: 3,
      };
      const solutionEntry4 = {
        id: 'solution-4',
        title: 'Solution four',
        subtitle: 'Subtitle for solution four',
        descriptions: ['Example use case'],
        icon: 'empty',
        path: 'path-to-solution-four',
        order: 4,
      };

      const component = await renderHome({
        solutions: [solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4],
      });

      expect(component).toMatchSnapshot();
    });

    test('should render DATA directory entry in "Ingest your data" panel', async () => {
      const directoryEntry = {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Display and share a collection of visualizations and saved searches.',
        icon: 'dashboardApp',
        path: 'dashboard_landing_page',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      };

      const component = await renderHome({
        directories: [directoryEntry],
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
      defaultProps.localStorage.getItem = sinon.spy(() => 'true');

      const component = await renderHome({
        find: () => Promise.resolve({ total: 0 }),
      });

      sinon.assert.calledOnce(defaultProps.localStorage.getItem);

      expect(component).toMatchSnapshot();
    });

    test('stores skip welcome setting if skipped', async () => {
      defaultProps.localStorage.getItem = sinon.spy(() => 'true');

      const component = await renderHome({
        find: () => Promise.resolve({ total: 0 }),
      });

      component.instance().skipWelcome();
      component.update();

      sinon.assert.calledWith(defaultProps.localStorage.setItem, 'home:welcome:show', 'false');

      expect(component).toMatchSnapshot();
    });

    test('should show the normal home page if loading fails', async () => {
      defaultProps.localStorage.getItem = sinon.spy(() => 'true');

      const component = await renderHome({
        find: () => Promise.reject('Doh!'),
      });

      expect(component).toMatchSnapshot();
    });

    test('should show the normal home page if welcome screen is disabled locally', async () => {
      defaultProps.localStorage.getItem = sinon.spy(() => 'false');

      const component = await renderHome();

      expect(component).toMatchSnapshot();
    });
  });

  describe('isNewKibanaInstance', () => {
    test('should set isNewKibanaInstance to true when there are no index patterns', async () => {
      const component = await renderHome({
        find: () => Promise.resolve({ total: 0 }),
      });

      expect(component).toMatchSnapshot();
    });

    test('should set isNewKibanaInstance to false when there are index patterns', async () => {
      const component = await renderHome({
        find: () => Promise.resolve({ total: 1 }),
      });

      expect(component).toMatchSnapshot();
    });

    test('should safely handle execeptions', async () => {
      const component = await renderHome({
        find: () => {
          throw new Error('simulated find error');
        },
      });

      expect(component).toMatchSnapshot();
    });
  });
});
