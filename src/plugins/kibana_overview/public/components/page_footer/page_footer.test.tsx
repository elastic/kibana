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
import { PageFooter } from './page_footer';
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

const mockAdvancedSettings = {
  category: FeatureCatalogueCategory.ADMIN,
  description: 'Configure Kibana.',
  icon: 'gear',
  id: 'advanced_settings',
  path: 'path-to-advanced_settings',
  title: 'Advanced Settings',
  showOnHomePage: false,
};

describe('PageHeader', () => {
  test('render', () => {
    const component = shallowWithIntl(<PageFooter features={[]} />);
    expect(component).toMatchSnapshot();
  });

  test('with advanced settings', () => {
    const component = shallowWithIntl(<PageFooter features={[mockAdvancedSettings]} />);
    expect(component).toMatchSnapshot();
  });
});
