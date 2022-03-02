/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView, DataViewField } from '../../../../../../plugins/data_views/public';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { IndexHeader } from '../index_header';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS } from '../constants';

import { FieldEditor } from '../../field_editor';

interface CreateEditFieldProps extends RouteComponentProps {
  indexPattern: DataView;
  mode?: string;
  fieldName?: string;
}

const newFieldPlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.scripted.newFieldPlaceholder',
  {
    defaultMessage: 'New Scripted Field',
  }
);

export const CreateEditField = withRouter(
  ({ indexPattern, mode, fieldName, history }: CreateEditFieldProps) => {
    const { uiSettings, chrome, notifications, dataViews } =
      useKibana<IndexPatternManagmentContext>().services;
    const spec =
      mode === 'edit' && fieldName
        ? indexPattern.fields.getByName(fieldName)?.spec
        : ({
            scripted: true,
            type: 'number',
            name: undefined,
          } as unknown as DataViewField);

    const url = `/dataView/${indexPattern.id}`;

    if (mode === 'edit' && !spec) {
      const message = i18n.translate('indexPatternManagement.editDataView.scripted.noFieldLabel', {
        defaultMessage:
          "'{dataViewTitle}' data view doesn't have a scripted field called '{fieldName}'",
        values: { dataViewTitle: indexPattern.title, fieldName },
      });
      notifications.toasts.addWarning(message);
      history.push(url);
    }

    const docFieldName = spec?.name || newFieldPlaceholder;

    chrome.docTitle.change([docFieldName, indexPattern.title]);

    const redirectAway = () => {
      history.push(
        `${url}#/?_a=(tab:${spec?.scripted ? TAB_SCRIPTED_FIELDS : TAB_INDEXED_FIELDS})`
      );
    };

    if (spec) {
      return (
        <>
          <IndexHeader
            indexPattern={indexPattern}
            defaultIndex={uiSettings.get('defaultIndex')}
            canSave={dataViews.getCanSaveSync()}
          />
          <EuiSpacer size={'l'} />
          <FieldEditor
            indexPattern={indexPattern}
            spec={spec}
            services={{
              indexPatternService: dataViews,
              redirectAway,
            }}
          />
        </>
      );
    } else {
      return <></>;
    }
  }
);
