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
import { BehaviorSubject } from 'rxjs';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataViewMgmtState } from '../../../management_app/data_view_management_service';
import { Tabs } from './tabs';
import { convertToEuiSelectableOptionsFromArray } from './utils';

const mockServices: Record<string, unknown> = {};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: mockServices }),
}));

const createScriptedField = ({ name, lang }: { name: string; lang: string }): FieldSpec => ({
  aggregatable: false,
  lang,
  name,
  script: 'emit(1)',
  scripted: true,
  searchable: false,
  type: 'number',
});

const SCRIPTED_FIELDS = [
  createScriptedField({ name: 'painlessField', lang: 'painless' }),
  createScriptedField({ name: 'otherPainlessField', lang: 'painless' }),
  createScriptedField({ name: 'expressionField', lang: 'expression' }),
];

const renderTabs = () => {
  const history = createMemoryHistory();
  const indexPattern = createStubDataView({
    spec: {
      title: 'test-data-view',
      fields: Object.fromEntries(SCRIPTED_FIELDS.map((field) => [field.name, field])),
    },
  });

  const state$ = new BehaviorSubject<
    Pick<DataViewMgmtState, 'fields' | 'indexedFieldTypes' | 'scriptedFieldLangs'>
  >({
    fields: [] as DataViewField[],
    indexedFieldTypes: [],
    scriptedFieldLangs: convertToEuiSelectableOptionsFromArray(['painless', 'expression']),
  });

  Object.assign(mockServices, {
    uiSettings: { get: jest.fn().mockReturnValue(false) },
    docLinks: {
      links: {
        scriptedFields: { painless: '#' },
        indexPatterns: { runtimeFields: '#' },
        query: { queryESQL: '#' },
      },
    },
    dataViewFieldEditor: {
      openEditor: jest.fn(),
      DeleteRuntimeFieldProvider: ({
        children,
      }: {
        children: (deleteField: jest.Mock) => React.ReactNode;
      }) => <>{children(jest.fn())}</>,
    },
    overlays: { openModal: jest.fn() },
    dataViews: { getCanSaveSync: () => false, scriptedFieldsEnabled: true },
    http: { basePath: {} },
    application: { capabilities: {} },
    savedObjectsManagement: {},
    dataViewMgmtService: { state$, refreshFields: jest.fn() },
  });

  return renderWithI18n(
    <Tabs
      indexPattern={indexPattern}
      fields={[]}
      saveIndexPattern={async () => {}}
      refreshFields={jest.fn()}
      relationships={[]}
      allowedTypes={[]}
      compositeRuntimeFields={{}}
      refreshIndexPatternClick={jest.fn()}
      history={history}
      location={history.location}
    />
  );
};

describe('Tabs scripted fields language filter', () => {
  beforeEach(() => {
    window.location.hash = '';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters the scripted fields table by the selected language', async () => {
    renderTabs();

    await userEvent.click(await screen.findByRole('tab', { name: /Scripted fields/ }));
    expect(screen.getByText('painlessField')).toBeVisible();
    expect(screen.getByText('otherPainlessField')).toBeVisible();
    expect(screen.getByText('expressionField')).toBeVisible();

    await userEvent.click(screen.getByTestId('scriptedFieldLanguageFilterDropdown'));
    await userEvent.click(screen.getByRole('option', { name: 'painless' }));

    expect(screen.getByText('painlessField')).toBeVisible();
    expect(screen.getByText('otherPainlessField')).toBeVisible();
    expect(screen.queryByText('expressionField')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: 'painless' }));
    await userEvent.click(screen.getByRole('option', { name: 'expression' }));

    expect(screen.getByText('expressionField')).toBeVisible();
    expect(screen.queryByText('painlessField')).not.toBeInTheDocument();
    expect(screen.queryByText('otherPainlessField')).not.toBeInTheDocument();
  });
});
