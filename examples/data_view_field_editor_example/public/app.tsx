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
import { AppMountParameters } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';

interface Props {
  dataView?: DataView;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
}

const DataViewFieldEditorExample = ({ dataView, dataViewFieldEditor }: Props) => {
  const [fields, setFields] = useState<DataViewField[]>(
    dataView?.fields.getAll().filter((f) => !f.scripted) || []
  );
  const refreshFields = () => setFields(dataView?.fields.getAll().filter((f) => !f.scripted) || []);
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
          onClick: (fld: DataViewField) =>
            dataViewFieldEditor.openEditor({
              ctx: { dataView: dataView! },
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
          onClick: (fld: DataViewField) =>
            dataViewFieldEditor.openDeleteModal({
              fieldName: fld.name,
              ctx: {
                dataView: dataView!,
              },
              onDelete: refreshFields,
            }),
        },
      ] as Array<DefaultItemAction<DataViewField>>,
    },
  ];

  const content = dataView ? (
    <>
      <EuiText data-test-subj="dataViewTitle">Data view: {dataView.title}</EuiText>
      <div>
        <EuiButton
          onClick={() =>
            dataViewFieldEditor.openEditor({
              ctx: { dataView },
              onSave: refreshFields,
            })
          }
          data-test-subj="addField"
        >
          Add field
        </EuiButton>
      </div>
      <EuiInMemoryTable<DataViewField>
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
    <p>Please create a data view</p>
  );

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>Data view field editor demo</EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>{content}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

interface RenderAppDependencies {
  data: DataPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
}

export const renderApp = async (
  { data, dataViewFieldEditor }: RenderAppDependencies,
  { element }: AppMountParameters
) => {
  const dataView = (await data.dataViews.getDefault()) || undefined;
  ReactDOM.render(
    <DataViewFieldEditorExample dataView={dataView} dataViewFieldEditor={dataViewFieldEditor} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
