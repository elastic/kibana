/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridCellValueElementProps, EuiLoadingContent } from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { useSelector } from '@xstate/react';
import React, { useContext } from 'react';
import { CELL_CLASS } from '../../../../components/discover_grid/get_render_cell_value';
import { formatFieldValue } from '../../../../utils/format_value';
import { useEntries } from '../../hooks/query_data/use_state_machine';
import { memoizedSelectRows } from '../../state_machines/entries_state_machine';
import { selectDataView } from '../../state_machines/entries_state_machine';

export function LogExplorerCell({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
  const { actor: entriesActor } = useEntries();
  const { rows } = useSelector(entriesActor, memoizedSelectRows);
  const dataView = useSelector(entriesActor, selectDataView);
  const { fieldFormats } = useContext(LogExplorerCellContext);

  const row = rows.get(rowIndex);

  if (row == null) {
    return '';
  } else if (row.type === 'loaded-entry') {
    const { entry } = row;
    const field = dataView.fields.getByName(columnId);
    return (
      <span
        className={CELL_CLASS}
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(
            entry.flattened[columnId],
            entry.raw,
            fieldFormats,
            dataView,
            field
          ),
        }}
      />
    );
  } else if (row.type === 'loading') {
    return <EuiLoadingContent lines={1} />;
  } else {
    return '';
  }
}

export interface LogExplorerCellContextValue {
  fieldFormats: FieldFormatsStart;
}

export const LogExplorerCellContext = React.createContext<LogExplorerCellContextValue>(undefined!);
