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
import { UiSettingsType } from '../../../../../../core/public';

import { Form } from './form';

jest.mock('../field', () => ({
  Field: () => {
    return 'field';
  },
}));

const defaults = {
  requiresPageReload: false,
  readOnly: false,
  value: 'value',
  description: 'description',
  isOverridden: false,
  type: 'string' as UiSettingsType,
  isCustom: false,
  defVal: 'defVal',
};

const settings = {
  dashboard: [
    {
      name: 'dashboard:test:setting',
      ariaName: 'dashboard test setting',
      displayName: 'Dashboard test setting',
      category: ['dashboard'],
      ...defaults,
    },
  ],
  general: [
    {
      name: 'general:test:date',
      ariaName: 'general test date',
      displayName: 'Test date',
      description: 'bar',
      category: ['general'],
      ...defaults,
    },
    {
      name: 'setting:test',
      ariaName: 'setting test',
      displayName: 'Test setting',
      description: 'foo',
      category: ['general'],
      ...defaults,
    },
  ],
  'x-pack': [
    {
      name: 'xpack:test:setting',
      ariaName: 'xpack test setting',
      displayName: 'X-Pack test setting',
      category: ['x-pack'],
      description: 'bar',
      ...defaults,
    },
  ],
};
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];
const categoryCounts = {
  general: 2,
  dashboard: 1,
  'x-pack': 10,
};
const save = (key: string, value: any) => Promise.resolve(true);
const clear = (key: string) => Promise.resolve(true);
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
        toasts={{} as any}
        dockLinks={{} as any}
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
        toasts={{} as any}
        dockLinks={{} as any}
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
        toasts={{} as any}
        dockLinks={{} as any}
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
        toasts={{} as any}
        dockLinks={{} as any}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
