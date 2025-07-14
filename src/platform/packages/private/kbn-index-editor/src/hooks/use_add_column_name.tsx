/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaContextExtra } from '../types';

export const useAddColumnName = () => {
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const columns = useObservable(indexUpdateService.dataTableColumns$, []);

  const [columnName, setColumnName] = useState('');

  const saveNewColumn = useCallback(async () => {
    if (!columnName) {
      notifications.toasts.addWarning({
        title: i18n.translate('indexEditor.addColumn.emptyName', {
          defaultMessage: 'Field name cannot be empty',
        }),
      });
      return false;
    }

    if (columns.some((existingColumn) => existingColumn.name === columnName)) {
      notifications.toasts.addWarning({
        title: i18n.translate('indexEditor.addColumn.duplicatedName', {
          defaultMessage: 'Field name {columnName} already exists',
          values: { columnName },
        }),
      });
      return false;
    }

    indexUpdateService.addNewColumn(columnName);
    notifications.toasts.addSuccess({
      title: i18n.translate('indexEditor.addColumn.success', {
        defaultMessage: 'Field {columnName} has been partially added',
        values: { columnName },
      }),
      text: i18n.translate('indexEditor.addColumn.successDescription', {
        defaultMessage: 'You need to add at least one value to this field before it is saved.',
      }),
      toastLifeTimeMs: 10000, // 10 seconds
    });

    return true;
  }, [columnName, columns, indexUpdateService, notifications.toasts]);

  return {
    columnName,
    setColumnName,
    saveNewColumn,
  };
};
