/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiButton,
  EuiInMemoryTable,
  EuiText,
  DefaultItemAction,
} from '@elastic/eui';
import { AppMountParameters } from '../../../src/core/public';
import {
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternField,
} from '../../../src/plugins/data/public';
import { IndexPatternFieldEditorStart } from '../../../src/plugins/index_pattern_field_editor/public';

interface Props {
  indexPattern?: IndexPattern;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

const IndexPatternFieldEditorExample = ({ indexPattern, indexPatternFieldEditor }: Props) => {
  const [fields, setFields] = useState<IndexPatternField[]>(
    indexPattern?.getNonScriptedFields() || []
  );
  const refreshFields = () => setFields(indexPattern?.getNonScriptedFields() || []);
  const columns = [
    {
      field: 'name',
      name: 'Field name',
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this field',
          icon: 'pencil',
          type: 'icon',
          'data-test-subj': 'editField',
          onClick: (fld: IndexPatternField) =>
            indexPatternFieldEditor.openEditor({
              ctx: { indexPattern: indexPattern! },
              fieldName: fld.name,
              onSave: refreshFields,
            }),
        },
        {
          name: 'Delete',
          description: 'Delete this field',
          icon: 'trash',
          type: 'icon',
          'data-test-subj': 'deleteField',
          available: (fld) => !!fld.runtimeField,
          onClick: (fld: IndexPatternField) =>
            indexPatternFieldEditor.openDeleteModal({
              fieldName: fld.name,
              ctx: {
                indexPattern: indexPattern!,
              },
              onDelete: refreshFields,
            }),
        },
      ] as Array<DefaultItemAction<IndexPatternField>>,
    },
  ];

  const content = indexPattern ? (
    <>
      <EuiText data-test-subj="indexPatternTitle">Index pattern: {indexPattern?.title}</EuiText>
      <div>
        <EuiButton
          onClick={() =>
            indexPatternFieldEditor.openEditor({
              ctx: { indexPattern: indexPattern! },
              onSave: refreshFields,
            })
          }
          data-test-subj="addField"
        >
          Add field
        </EuiButton>
      </div>
      <EuiInMemoryTable<IndexPatternField>
        items={fields}
        columns={columns}
        pagination={true}
        hasActions={true}
        sorting={{
          sort: {
            field: 'name',
            direction: 'asc',
          },
        }}
      />
    </>
  ) : (
    <p>Please create an index pattern</p>
  );

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>Index pattern field editor demo</EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>{content}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

interface RenderAppDependencies {
  data: DataPublicPluginStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

export const renderApp = async (
  { data, indexPatternFieldEditor }: RenderAppDependencies,
  { element }: AppMountParameters
) => {
  const indexPattern = (await data.indexPatterns.getDefault()) || undefined;
  ReactDOM.render(
    <IndexPatternFieldEditorExample
      indexPattern={indexPattern}
      indexPatternFieldEditor={indexPatternFieldEditor}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
