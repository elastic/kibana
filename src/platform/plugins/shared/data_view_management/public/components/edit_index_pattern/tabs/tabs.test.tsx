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
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { mockManagementPlugin } from '../../../mocks';
import { DataViewMgmtService } from '../../../management_app/data_view_management_service';
import { Tabs } from './tabs';

const indexedFieldsDataView = createStubDataView({
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

const renderTabs = async (dataView: DataView = indexedFieldsDataView) => {
  const context = mockManagementPlugin.createIndexPatternManagmentContext();
  context.savedObjectsManagement.getAllowedTypes.mockResolvedValue([]);
  context.savedObjectsManagement.getRelationships.mockResolvedValue({ relations: [] });
  context.dataViews.getRollupsEnabled = jest.fn(() => false);
  context.dataViews.scriptedFieldsEnabled = true;

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

  await screen.findByRole('tab', { name: /Fields/ });
};

const createScriptedField = ({ name, lang }: { name: string; lang: string }): FieldSpec => ({
  aggregatable: false,
  lang,
  name,
  script: 'emit(1)',
  scripted: true,
  searchable: false,
  type: 'number',
});

const scriptedFieldsDataView = createStubDataView({
  spec: {
    id: 'scripted-data-view',
    title: 'scripted-data-view',
    fields: Object.fromEntries(
      [
        createScriptedField({ name: 'painlessField', lang: 'painless' }),
        createScriptedField({ name: 'otherPainlessField', lang: 'painless' }),
        createScriptedField({ name: 'expressionField', lang: 'expression' }),
      ].map((field) => [field.name, field])
    ),
  },
});

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
    await screen.findByTestId('field-name-bytes');
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
    await screen.findByTestId('field-name-bytes');

    await user.type(screen.getByTestId('indexPatternFieldFilter'), '@message');
    expect(getVisibleFieldNames()).toEqual(['@message', '@message.raw']);

    await user.click(screen.getByTestId('clearSearchButton'));

    expect(screen.getByTestId('tab-indexedFields')).toHaveTextContent('Fields (4)');
    expect(getVisibleFieldNames()).toEqual(ALL_FIELDS);
  });

  it('shows only fields of the selected type in the type filter', async () => {
    const user = userEvent.setup();
    await renderTabs();
    await screen.findByTestId('field-name-bytes');

    await user.click(screen.getByTestId('indexedFieldTypeFilterDropdown'));
    await user.click(await screen.findByTestId('selectable-option-keyword'));
    expect(getVisibleFieldNames()).toEqual(['@message.raw']);

    await user.click(screen.getByTestId('selectable-option-keyword'));
    await user.click(screen.getByTestId('selectable-option-long'));
    expect(getVisibleFieldNames()).toEqual(['bytes']);
  });
});

describe('Tabs scripted fields language filter', () => {
  beforeEach(() => {
    window.location.hash = '';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters the scripted fields table by the selected language', async () => {
    const user = userEvent.setup();
    await renderTabs(scriptedFieldsDataView);

    await user.click(await screen.findByRole('tab', { name: /Scripted fields/ }));
    expect(screen.getByText('painlessField')).toBeVisible();
    expect(screen.getByText('otherPainlessField')).toBeVisible();
    expect(screen.getByText('expressionField')).toBeVisible();

    await user.click(screen.getByTestId('scriptedFieldLanguageFilterDropdown'));
    await user.click(screen.getByRole('option', { name: 'painless' }));

    expect(screen.getByText('painlessField')).toBeVisible();
    expect(screen.getByText('otherPainlessField')).toBeVisible();
    expect(screen.queryByText('expressionField')).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'painless' }));
    await user.click(screen.getByRole('option', { name: 'expression' }));

    expect(screen.getByText('expressionField')).toBeVisible();
    expect(screen.queryByText('painlessField')).not.toBeInTheDocument();
    expect(screen.queryByText('otherPainlessField')).not.toBeInTheDocument();
  });
});
