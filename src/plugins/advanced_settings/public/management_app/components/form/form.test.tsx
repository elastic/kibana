/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { UiSettingsType } from '../../../../../../core/public';
import { themeServiceMock, notificationServiceMock } from '../../../../../../core/public/mocks';
import { SettingsChanges } from '../../types';
import { Form } from './form';

jest.mock('../field', () => ({
  Field: () => {
    return 'field';
  },
}));

beforeAll(() => {
  const localStorage: Record<string, any> = {
    'core.chrome.isLocked': true,
  };

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => {
        return localStorage[key] || null;
      },
    },
    writable: true,
  });
});

afterAll(() => {
  delete (window as any).localStorage;
});

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
      ...defaults,
      name: 'dashboard:test:setting',
      ariaName: 'dashboard test setting',
      displayName: 'Dashboard test setting',
      category: ['dashboard'],
      requiresPageReload: true,
    },
  ],
  general: [
    {
      ...defaults,
      name: 'general:test:date',
      ariaName: 'general test date',
      displayName: 'Test date',
      description: 'bar',
      category: ['general'],
    },
    {
      ...defaults,
      name: 'setting:test',
      ariaName: 'setting test',
      displayName: 'Test setting',
      description: 'foo',
      category: ['general'],
    },
    {
      ...defaults,
      name: 'general:test:array',
      ariaName: 'array test',
      displayName: 'Test array setting',
      description: 'array foo',
      type: 'array' as UiSettingsType,
      category: ['general'],
      defVal: ['test'],
    },
  ],
  'x-pack': [
    {
      ...defaults,
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
const save = jest.fn((changes: SettingsChanges) => Promise.resolve([true]));

const clearQuery = () => {};

describe('Form', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={true}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render read-only when saving is disabled', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render no settings message when there are no settings', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={{}}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={true}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should not render no settings message when instructed not to', async () => {
    const component = shallowWithI18nProvider(
      <Form
        settings={{}}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={false}
        enableSaving={true}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should hide bottom bar when clicking on the cancel changes button', async () => {
    const wrapper = mountWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );
    (wrapper.instance() as Form).setState({
      unsavedChanges: {
        'dashboard:test:setting': {
          value: 'changedValue',
        },
      },
    });
    const updated = wrapper.update();
    expect(updated.exists('[data-test-subj="advancedSetting-bottomBar"]')).toEqual(true);
    await findTestSubject(updated, `advancedSetting-cancelButton`).simulate('click');
    updated.update();
    expect(updated.exists('[data-test-subj="advancedSetting-bottomBar"]')).toEqual(false);
  });

  it('should show a reload toast when saving setting requiring a page reload', async () => {
    const toasts = notificationServiceMock.createStartContract().toasts;
    const wrapper = mountWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
        toasts={toasts}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );
    (wrapper.instance() as Form).setState({
      unsavedChanges: {
        'dashboard:test:setting': {
          value: 'changedValue',
        },
      },
    });
    const updated = wrapper.update();

    findTestSubject(updated, `advancedSetting-saveButton`).simulate('click');
    expect(save).toHaveBeenCalled();
    await save({ 'dashboard:test:setting': 'changedValue' });
    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining(
          'One or more settings require you to reload the page to take effect.'
        ),
      })
    );
  });

  it('should save an array typed field when user provides an empty string correctly', async () => {
    const wrapper = mountWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    (wrapper.instance() as Form).setState({
      unsavedChanges: {
        'general:test:array': {
          value: '',
        },
      },
    });

    findTestSubject(wrapper.update(), `advancedSetting-saveButton`).simulate('click');
    expect(save).toHaveBeenCalledWith({ 'general:test:array': [] });
  });

  it('should save an array typed field when user provides a comma separated string correctly', async () => {
    const wrapper = mountWithI18nProvider(
      <Form
        settings={settings}
        visibleSettings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clearQuery={clearQuery}
        showNoResultsMessage={true}
        enableSaving={false}
        toasts={{} as any}
        docLinks={{} as any}
        theme={themeServiceMock.createStartContract().theme$}
      />
    );

    (wrapper.instance() as Form).setState({
      unsavedChanges: {
        'general:test:array': {
          value: 'test1, test2',
        },
      },
    });

    findTestSubject(wrapper.update(), `advancedSetting-saveButton`).simulate('click');
    expect(save).toHaveBeenCalledWith({ 'general:test:array': ['test1', 'test2'] });
  });
});
