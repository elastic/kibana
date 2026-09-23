/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { FetchStatus } from '../application/types';
import type { DataDocumentsMsg } from '../application/main/state_management/discover_data_state_container';

const EMPTY_ESQL_COLUMNS: DatatableColumn[] = [];

/**
 * Converts Discover ES|QL document results into the Datatable histogram/grid consumers share.
 */
export const getEsqlDatatableFromDocuments = ({
  documentsValue,
  isEsqlMode,
}: {
  documentsValue: DataDocumentsMsg | undefined;
  isEsqlMode: boolean;
}): { table: Datatable | undefined; esqlQueryColumns: DatatableColumn[] } => {
  if (
    !isEsqlMode ||
    !documentsValue?.result ||
    ![FetchStatus.COMPLETE, FetchStatus.ERROR].includes(documentsValue.fetchStatus)
  ) {
    return {
      table: undefined,
      esqlQueryColumns: EMPTY_ESQL_COLUMNS,
    };
  }

  const esqlQueryColumns = documentsValue.esqlQueryColumns || EMPTY_ESQL_COLUMNS;
  return {
    table: {
      type: 'datatable',
      rows: documentsValue.result.map((r) => r.raw),
      columns: esqlQueryColumns,
      meta: { type: ESQL_TABLE_TYPE },
    },
    esqlQueryColumns,
  };
};
