/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { ScriptedFieldsTable } from '.';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: {
        links: {
          indexPatterns: {
            runtimeFields: '#',
          },
          query: {
            queryESQL: '#',
          },
        },
      },
    },
  }),
}));

const helpers = {
  getRouteHref: jest.fn(),
  redirectToRoute: jest.fn(),
};

const createDataViewWithScriptedFields = (scriptedFields: FieldSpec[]) =>
  createStubDataView({
    spec: {
      title: 'test-data-view',
      fields: Object.fromEntries(scriptedFields.map((field) => [field.name, field])),
    },
  });

const createScriptedField = ({
  name,
  lang = 'painless',
  script,
}: {
  name: string;
  lang?: string;
  script: string;
}): FieldSpec => ({
  aggregatable: false,
  lang,
  name,
  script,
  scripted: true,
  searchable: false,
  type: 'number',
});

const getDeleteButtonForField = (fieldName: string) =>
  within(screen.getByRole('row', { name: new RegExp(fieldName) })).getAllByRole('button', {
    name: 'Edit',
  })[1];

describe('ScriptedFieldsTable', () => {
  let indexPattern: DataView;

  beforeEach(() => {
    indexPattern = createDataViewWithScriptedFields([
      createScriptedField({ name: 'ScriptedField', script: 'x++' }),
      createScriptedField({ name: 'JustATest', script: 'z++' }),
    ]);
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silent EUI warnings during tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render normally', () => {
    renderWithI18n(
      <ScriptedFieldsTable
        helpers={helpers}
        indexPattern={indexPattern}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        scriptedFieldLanguageFilter={[]}
        userEditPermission={false}
      />
    );

    expect(screen.getByText('Scripted fields are deprecated')).toBeVisible();
    expect(screen.getByTestId('tableHeaderCell_displayName_0')).toBeVisible();
    expect(screen.getByText('ScriptedField')).toBeVisible();
    expect(screen.getByText('JustATest')).toBeVisible();
    expect(screen.queryByText('Deprecated languages in use')).not.toBeInTheDocument();
  });

  it('should filter based on the query bar', () => {
    renderWithI18n(
      <ScriptedFieldsTable
        fieldFilter="Just"
        helpers={helpers}
        indexPattern={indexPattern}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        scriptedFieldLanguageFilter={[]}
        userEditPermission={false}
      />
    );

    expect(screen.queryByText('ScriptedField')).not.toBeInTheDocument();
    expect(screen.getByText('JustATest')).toBeVisible();
  });

  it('should filter based on the lang filter', () => {
    const BAD_LANG = 'somethingElse';
    const indexPatternWithDeprecatedLang = createDataViewWithScriptedFields([
      createScriptedField({ name: 'ScriptedField', script: 'x++' }),
      createScriptedField({ name: 'JustATest', script: 'z++' }),
      createScriptedField({ name: 'Bad', lang: BAD_LANG, script: 'z++' }),
    ]);

    renderWithI18n(
      <ScriptedFieldsTable
        helpers={helpers}
        indexPattern={indexPatternWithDeprecatedLang}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        scriptedFieldLanguageFilter={['painless']}
        userEditPermission={false}
      />
    );

    expect(screen.getByText('Deprecated languages in use')).toBeVisible();
    expect(
      screen.getByText(`The following deprecated languages are in use: ${BAD_LANG}.`, {
        exact: false,
      })
    ).toBeVisible();
    expect(screen.getByText('ScriptedField')).toBeVisible();
    expect(screen.getByText('JustATest')).toBeVisible();
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
  });

  it('should show an empty table if there are no scripted fields', () => {
    renderWithI18n(
      <ScriptedFieldsTable
        helpers={helpers}
        indexPattern={createDataViewWithScriptedFields([])}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        scriptedFieldLanguageFilter={[]}
        userEditPermission={false}
      />
    );

    expect(screen.getByTestId('tableHeaderCell_displayName_0')).toBeVisible();
    expect(screen.getByText('No items found')).toBeVisible();
    expect(screen.queryByText('ScriptedField')).not.toBeInTheDocument();
    expect(screen.queryByText('JustATest')).not.toBeInTheDocument();
  });

  it('should show a delete modal', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <ScriptedFieldsTable
        helpers={helpers}
        indexPattern={indexPattern}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={async () => {}}
        scriptedFieldLanguageFilter={[]}
        userEditPermission={true}
      />
    );

    await user.click(getDeleteButtonForField('ScriptedField'));

    expect(screen.getByText("Delete scripted field 'ScriptedField'?")).toBeVisible();
  });

  it('should delete a field', async () => {
    const user = userEvent.setup();

    const removeScriptedFieldSpy = jest.fn();
    const saveIndexPatternSpy = jest.fn();
    jest.spyOn(indexPattern, 'removeScriptedField').mockImplementation(removeScriptedFieldSpy);

    renderWithI18n(
      <ScriptedFieldsTable
        helpers={helpers}
        indexPattern={indexPattern}
        painlessDocLink={'painlessDoc'}
        saveIndexPattern={saveIndexPatternSpy}
        scriptedFieldLanguageFilter={[]}
        userEditPermission={true}
      />
    );

    await user.click(getDeleteButtonForField('ScriptedField'));
    expect(screen.getByText("Delete scripted field 'ScriptedField'?")).toBeVisible();
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(removeScriptedFieldSpy).toHaveBeenCalledWith('ScriptedField');
    expect(saveIndexPatternSpy).toHaveBeenCalledWith(indexPattern);
  });
});
