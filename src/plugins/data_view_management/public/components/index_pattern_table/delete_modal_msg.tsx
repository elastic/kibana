/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut, EuiTableFieldDataColumnType, EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { RemoveDataViewProps } from '../edit_index_pattern';

const all = i18n.translate('indexPatternManagement.dataViewTable.spaceCountAll', {
  defaultMessage: 'all',
});

const dataViewColumnName = i18n.translate(
  'indexPatternManagement.dataViewTable.dataViewColumnName',
  {
    defaultMessage: 'Data view',
  }
);

const spacesColumnName = i18n.translate('indexPatternManagement.dataViewTable.spacesColumnName', {
  defaultMessage: 'Spaces',
});

const tableTitle = i18n.translate('indexPatternManagement.dataViewTable.tableTitle', {
  defaultMessage: 'Data views selected for deletion',
});

export const deleteModalMsg = (views: RemoveDataViewProps[], hasSpaces: boolean) => {
  const columns: Array<EuiTableFieldDataColumnType<any>> = [
    {
      field: 'title',
      name: dataViewColumnName,
      sortable: true,
    },
  ];
  if (hasSpaces) {
    columns.push({
      field: 'namespaces',
      name: spacesColumnName,
      sortable: true,
      width: '100px',
      align: 'right',
      render: (namespaces: string[]) => (namespaces.indexOf('*') !== -1 ? all : namespaces.length),
    });
  }

  return (
    <div>
      <EuiCallOut
        color="warning"
        iconType="alert"
        title="Data views are deleted from every space they are shared in."
      />
      <EuiSpacer size="m" />
      <div>
        <FormattedMessage
          id="indexPatternManagement.dataViewTable.deleteConfirmSummary"
          defaultMessage="You'll permanently delete {count, number} {count, plural,
          one {data view}
          other {data views}
}."
          values={{ count: views.length }}
        />
      </div>
      <EuiSpacer size="m" />
      <EuiBasicTable tableCaption={tableTitle} items={views} columns={columns} />
    </div>
  );
};
