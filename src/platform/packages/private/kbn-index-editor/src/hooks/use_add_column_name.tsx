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
import { isPlaceholderColumn } from '../utils';
import type { KibanaContextExtra } from '../types';

const fieldAlreadyExistsError = (columnName: string) =>
  i18n.translate('indexEditor.addColumn.duplicatedName', {
    defaultMessage: 'Field name {columnName} already exists',
    values: { columnName },
  });

export const useAddColumnName = (initialColumnName = '') => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();
  const columns = useObservable(indexUpdateService.dataTableColumns$, []);

  const initialInputValue = isPlaceholderColumn(initialColumnName) ? '' : initialColumnName;
  const [columnName, setColumnName] = useState(initialInputValue);

  const validationError = useMemo(() => {
    if (
      columnName !== initialColumnName &&
      columns.some((existingColumn) => existingColumn.name === columnName)
    ) {
      return fieldAlreadyExistsError(columnName);
    }

    return null;
  }, [columnName, columns, initialColumnName]);

  const saveColumn = useCallback(() => {
    if (validationError) {
      return;
    }
    if (initialColumnName) {
      indexUpdateService.editColumn(columnName, initialColumnName);
    } else {
      indexUpdateService.addNewColumn();
    }
  }, [columnName, indexUpdateService, initialColumnName, validationError]);

  const resetColumnName = () => {
    setColumnName(initialInputValue);
  };

  return {
    columnName,
    validationError,
    setColumnName,
    saveColumn,
    resetColumnName,
  };
};
