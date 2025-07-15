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
import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaContextExtra } from '../types';

export const useAddColumnName = () => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const columns = useObservable(indexUpdateService.dataTableColumns$, []);

  const [columnName, setColumnName] = useState('');

  const validationError = useMemo(() => {
    if (columns.some((existingColumn) => existingColumn.name === columnName)) {
      return i18n.translate('indexEditor.addColumn.duplicatedName', {
        defaultMessage: 'Field name {columnName} already exists',
        values: { columnName },
      });
    }

    return null;
  }, [columnName, columns]);

  const saveNewColumn = useCallback(async () => {
    if (!validationError) {
      indexUpdateService.addNewColumn(columnName);
    }
  }, [columnName, indexUpdateService, validationError]);

  return {
    columnName,
    validationError,
    setColumnName,
    saveNewColumn,
  };
};
