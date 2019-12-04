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
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';

import { Form } from './form';

jest.mock('../field', () => ({
  Field: () => {
    return 'field';
  },
}));

const settings = {
  dashboard: [
    {
      name: 'dashboard:test:setting',
      ariaName: 'dashboard test setting',
      displayName: 'Dashboard test setting',
      category: ['dashboard'],
    },
  ],
  general: [
    {
      name: 'general:test:date',
      ariaName: 'general test date',
      displayName: 'Test date',
      description: 'bar',
      category: ['general'],
    },
    {
      name: 'setting:test',
      ariaName: 'setting test',
      displayName: 'Test setting',
      description: 'foo',
      category: ['general'],
    },
  ],
  'x-pack': [
    {
      name: 'xpack:test:setting',
      ariaName: 'xpack test setting',
      displayName: 'X-Pack test setting',
      category: ['x-pack'],
      description: 'bar',
    },
  ],
};
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];
const categoryCounts = {
  general: 2,
  dashboard: 1,
  'x-pack': 10,
};
const save = () => {};
const clear = () => {};
const clearQuery = () => {};

describe('Form', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render read-only when saving is disabled', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render no settings message when there are no settings', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={{}}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should not render no settings message when instructed not to', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={{}}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
        showNoResultsMessage={false}
        enableSaving={true}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
