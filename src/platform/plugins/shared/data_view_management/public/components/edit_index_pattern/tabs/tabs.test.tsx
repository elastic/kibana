/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { mockManagementPlugin } from '../../../mocks';
import { DataViewMgmtService } from '../../../management_app/data_view_management_service';
import { Tabs } from './tabs';

// Migrated from: src/platform/test/functional/apps/management/group1/_index_pattern_filter.ts

const dataView = createStubDataView({
  spec: {
    id: 'test-data-view',
    title: 'test-data-view',
    fields: {
      '@message': {
        name: '@message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
      },
      '@message.raw': {
        name: '@message.raw',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
      },
      '@tags': {
        name: '@tags',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
      },
      bytes: {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
      },
    },
  },
});

const ALL_FIELDS = ['@message', '@message.raw', '@tags', 'bytes'];

const renderTabs = async () => {
  const context = mockManagementPlugin.createIndexPatternManagmentContext();
  context.savedObjectsManagement.getAllowedTypes.mockResolvedValue([]);
  context.savedObjectsManagement.getRelationships.mockResolvedValue({ relations: [] });
  context.dataViews.getRollupsEnabled = jest.fn(() => false);

  const dataViewMgmtService = new DataViewMgmtService({
    services: {
      application: context.application,
      dataViews: context.dataViews,
      savedObjectsManagement: context.savedObjectsManagement,
      uiSettings: context.uiSettings,
    },
    initialValues: {},
  });
  await dataViewMgmtService.setDataView(dataView);

  const history = createMemoryHistory();

  renderWithI18n(
    <KibanaContextProvider services={{ ...context, dataViewMgmtService }}>
      <Tabs
        indexPattern={dataView}
        fields={dataView.fields.getAll()}
        saveIndexPattern={jest.fn()}
        refreshFields={jest.fn()}
        relationships={[]}
        allowedTypes={[]}
        compositeRuntimeFields={{}}
        refreshIndexPatternClick={jest.fn()}
        history={history}
        location={history.location}
      />
    </KibanaContextProvider>
  );

  await screen.findByTestId('field-name-bytes');
};

const getVisibleFieldNames = () =>
  ALL_FIELDS.filter((name) => screen.queryByTestId(`field-name-${name}`) !== null);

describe('Tabs field list filters', () => {
  beforeEach(() => {
    window.location.hash = '';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('narrows the field list and tab count as the search text is refined', async () => {
    const user = userEvent.setup();
    await renderTabs();
    const search = screen.getByTestId('indexPatternFieldFilter');

    await user.type(search, '@');
    expect(await screen.findByTestId('tab-indexedFields')).toHaveTextContent('Fields (3 / 4)');
    expect(getVisibleFieldNames()).toEqual(['@message', '@message.raw', '@tags']);

    await user.type(search, 'message');
    expect(await screen.findByTestId('tab-indexedFields')).toHaveTextContent('Fields (2 / 4)');
    expect(getVisibleFieldNames()).toEqual(['@message', '@message.raw']);
  });

  it('restores the full field list when the search is cleared', async () => {
    const user = userEvent.setup();
    await renderTabs();

    await user.type(screen.getByTestId('indexPatternFieldFilter'), '@message');
    expect(getVisibleFieldNames()).toEqual(['@message', '@message.raw']);

    await user.click(screen.getByTestId('clearSearchButton'));

    expect(screen.getByTestId('tab-indexedFields')).toHaveTextContent('Fields (4)');
    expect(getVisibleFieldNames()).toEqual(ALL_FIELDS);
  });

  it('shows only fields of the selected type in the type filter', async () => {
    const user = userEvent.setup();
    await renderTabs();

    await user.click(screen.getByTestId('indexedFieldTypeFilterDropdown'));
    await user.click(await screen.findByTestId('selectable-option-keyword'));
    expect(getVisibleFieldNames()).toEqual(['@message.raw']);

    await user.click(screen.getByTestId('selectable-option-keyword'));
    await user.click(screen.getByTestId('selectable-option-long'));
    expect(getVisibleFieldNames()).toEqual(['bytes']);
  });
});
