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

import './home.test.mocks';

import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { Home } from './home';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

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
        getItem: sinon.spy(path => {
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
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));

    return component;
  }

  test('should render home component', async () => {
    const component = await renderHome();

    expect(component).toMatchSnapshot();
  });

  describe('directories', () => {
    test('should render DATA directory entry in "Explore Data" panel', async () => {
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

    test('should render ADMIN directory entry in "Manage" panel', async () => {
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
        id: 'management',
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
