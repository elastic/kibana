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
import { PageHeader } from './page_header';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { FeatureCatalogueCategory } from '../../../../../../src/plugins/home/public';

jest.mock('../../app_navigation_handler', () => {
  return {
    createAppNavigationHandler: jest.fn(() => () => {}),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

const mockDevTools = {
  category: FeatureCatalogueCategory.ADMIN,
  description: 'Skip cURL and use a JSON interface to work with your data in Console.',
  icon: 'consoleApp',
  id: 'console',
  path: 'path-to-dev-tools',
  showOnHomePage: false,
  title: 'Interact with the Elasticsearch API',
};

const mockManagement = {
  category: FeatureCatalogueCategory.ADMIN,
  description: 'Your center console for managing the Elastic Stack.',
  icon: 'managementApp',
  id: 'stack-management',
  path: 'path-to-management',
  showOnHomePage: false,
  title: 'Stack Management',
};

describe('PageHeader', () => {
  test('render', () => {
    const component = shallowWithIntl(<PageHeader isNewKibanaInstance={true} features={[]} />);
    expect(component).toMatchSnapshot();
  });
  test('with dev tools', () => {
    const component = shallowWithIntl(
      <PageHeader isNewKibanaInstance={false} features={[mockDevTools]} />
    );
    expect(component).toMatchSnapshot();
  });
  test('with management', () => {
    const component = shallowWithIntl(
      <PageHeader isNewKibanaInstance={false} features={[mockManagement]} />
    );
    expect(component).toMatchSnapshot();
  });
  test('with both apps', () => {
    const component = shallowWithIntl(
      <PageHeader isNewKibanaInstance={false} features={[mockDevTools, mockManagement]} />
    );
    expect(component).toMatchSnapshot();
  });
  test('new Kibana instance', () => {
    const component = shallowWithIntl(
      <PageHeader isNewKibanaInstance={true} features={[mockDevTools, mockManagement]} />
    );
    expect(component).toMatchSnapshot();
  });
});
