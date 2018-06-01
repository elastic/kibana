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
import { shallow } from 'enzyme';
import { Home } from './home';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

const addBasePath = (url) => { return `base_path/${url}`; };

test('should render home component', () => {
  const recentlyAccessed = [
    {
      label: 'my vis',
      link: 'link_to_my_vis',
      id: '1'
    }
  ];
  const component = shallow(<Home
    addBasePath={addBasePath}
    directories={[]}
    apmUiEnabled={true}
    recentlyAccessed={recentlyAccessed}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should not contain RecentlyAccessed panel when there is no recentlyAccessed history', () => {
  const component = shallow(<Home
    addBasePath={addBasePath}
    directories={[]}
    apmUiEnabled={true}
    recentlyAccessed={[]}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('directories', () => {
  test('should render DATA directory entry in "Explore Data" panel', () => {
    const directoryEntry = {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Display and share a collection of visualizations and saved searches.',
      icon: 'dashboardApp',
      path: 'dashboard_landing_page',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('should render ADMIN directory entry in "Manage" panel', () => {
    const directoryEntry = {
      id: 'index_patterns',
      title: 'Index Patterns',
      description: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
      icon: 'indexPatternApp',
      path: 'index_management_landing_page',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('should not render directory entry when showOnHomePage is false', () => {
    const directoryEntry = {
      id: 'management',
      title: 'Management',
      description: 'Your center console for managing the Elastic Stack.',
      icon: 'managementApp',
      path: 'management_landing_page',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
