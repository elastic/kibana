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

import { FeatureCatalogueCategory, FeatureCatalogueHomePageSection } from '../../services';

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
    test('should not render directory entry if no home page section is specified', async () => {
      const directoryEntry = {
        id: 'stack-management',
        title: 'Management',
        description: 'Your center console for managing the Elastic Stack.',
        icon: 'managementApp',
        path: 'management_landing_page',
        category: FeatureCatalogueCategory.ADMIN,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });
  });

  describe('directories', () => {
    test('should not render directory entry if no home page section is specified', async () => {
      const directoryEntry = {
        id: 'stack-management',
        title: 'Management',
        description: 'Your center console for managing the Elastic Stack.',
        icon: 'managementApp',
        path: 'management_landing_page',
        category: FeatureCatalogueCategory.ADMIN,
      };

      const component = await renderHome({
        directories: [directoryEntry],
      });

      expect(component).toMatchSnapshot();
    });

    describe('solutions section', () => {
      test('should render the Kibana solution card in "solutions" section', async () => {
        const directoryEntry = {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Display and share a collection of visualizations and saved searches.',
          icon: 'dashboardApp',
          path: 'dashboard_landing_page',
          category: FeatureCatalogueCategory.DATA,
          homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
          solution: 'kibana',
        };

        const solutionEntry = {
          id: 'kibana',
          title: 'Kibana',
          description: 'Visualize & analyze',
          icon: 'logoKibana',
          path: 'kibana_landing_page',
        };

        const component = await renderHome({
          directories: [directoryEntry],
          solutions: [solutionEntry],
        });

        expect(component).toMatchSnapshot();
      });

      test('should render the Kibana and other solution cards', async () => {
        const directoryEntry1 = {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Display and share a collection of visualizations and saved searches.',
          icon: 'dashboardApp',
          path: 'dashboard_landing_page',
          category: FeatureCatalogueCategory.DATA,
          homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
          solution: 'kibana',
          order: 1,
        };

        const directoryEntry2 = {
          id: 'feature-2',
          title: 'Feature two',
          description: 'Description of feature two',
          icon: 'empty',
          path: 'path-to-feature-two',
          solution: 'solution-2',
          category: FeatureCatalogueCategory.DATA,
          homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
          order: 1,
        };
        const directoryEntry3 = {
          id: 'feature-3',
          title: 'Feature three',
          description: 'Description of feature three',
          icon: 'empty',
          path: 'path-to-feature-three',
          solution: 'solution-3',
          category: FeatureCatalogueCategory.DATA,
          homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
          order: 1,
        };
        const directoryEntry4 = {
          id: 'feature-4',
          title: 'Feature four',
          description: 'Description of feature four',
          icon: 'empty',
          path: 'path-to-feature-four',
          solution: 'solution-4',
          category: FeatureCatalogueCategory.DATA,
          homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
          order: 1,
        };

        const solutionEntry1 = {
          id: 'kibana',
          title: 'Kibana',
          description: 'Visualize & analyze',
          icon: 'logoKibana',
          path: 'kibana_landing_page',
          order: 1,
        };
        const solutionEntry2 = {
          id: 'solution-2',
          title: 'Solution two',
          description: 'Description about solution two',
          icon: 'empty',
          path: 'path-to-solution-two',
          order: 2,
        };
        const solutionEntry3 = {
          id: 'solution-3',
          title: 'Solution three',
          description: 'Description about solution three',
          icon: 'empty',
          path: 'path-to-solution-three',
          order: 3,
        };
        const solutionEntry4 = {
          id: 'solution-4',
          title: 'Solution four',
          description: 'Description about solution four',
          icon: 'empty',
          path: 'path-to-solution-four',
          order: 4,
        };

        const component = await renderHome({
          directories: [directoryEntry1, directoryEntry2, directoryEntry3, directoryEntry4],
          solutions: [solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4],
        });

        expect(component).toMatchSnapshot();
      });
    });

    describe('add data section', () => {
      test('should render directory entries in ADD_DATA section', async () => {
        const component = await renderHome({
          directories: [
            {
              category: 'data',
              description: 'Ingest data from popular apps and services.',
              homePageSection: FeatureCatalogueHomePageSection.ADD_DATA,
              icon: 'indexOpen',
              id: 'home_tutorial_directory',
              order: 500,
              path: 'path-to-tutorial-directory',
              title: 'Ingest data',
            },
            {
              category: 'admin',
              description: 'Add and manage your fleet of Elastic Agents and integrations.',
              homePageSection: FeatureCatalogueHomePageSection.ADD_DATA,
              icon: 'logstashInput',
              id: 'ingestManager',
              order: 510,
              path: 'path-to-ingest-manager',
              title: 'Add Elastic Agent',
            },
          ],
        });

        expect(component).toMatchSnapshot();
      });
    });

    describe('manage data section', () => {
      test('should render directory entries in MANAGE_DATA section', async () => {
        const component = await renderHome({
          directories: [
            {
              category: 'admin',
              description: 'Control who has access and what tasks they can perform.',
              homePageSection: FeatureCatalogueHomePageSection.MANAGE_DATA,
              icon: 'securityApp',
              id: 'security',
              order: 600,
              path: 'path-to-security',
              title: 'Protect your data',
            },
            {
              category: 'admin',
              description: 'Track the real-time health and performance of your deployment.',
              homePageSection: FeatureCatalogueHomePageSection.MANAGE_DATA,
              icon: 'monitoringApp',
              id: 'monitoring',
              order: 610,
              path: 'path-to-monitoring',
              title: 'Monitor the stack',
            },
          ],
        });

        expect(component).toMatchSnapshot();
      });
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
            title: 'Advanced settings',
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
