/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ESQLStatsQueryMeta } from '../utils';

interface ESQLDataCascadeLeafCellProps
  extends Omit<
    UnifiedDataTableProps,
    | 'loadingState'
    | 'onSetColumns'
    | 'sampleSizeState'
    | 'onUpdateSampleSize'
    | 'onUpdateDataGridDensity'
    | 'expandedDoc'
    | 'setExpandedDoc'
  > {
  cellData: DataTableRecord[];
  cellId: string;
  queryMeta: ESQLStatsQueryMeta;
}

export const ESQLDataCascadeLeafCell = React.memo(
  ({
    cellData,
    cellId,
    queryMeta,
    dataGridDensityState,
    showTimeCol,
    dataView,
    services,
    columns,
    showKeyboardShortcuts,
    renderDocumentView,
    externalCustomRenderers,
  }: ESQLDataCascadeLeafCellProps) => {
    const [, setVisibleColumns] = useState(queryMeta.groupByFields.map((group) => group.field));
    const [sampleSize, setSampleSize] = useState(cellData.length);
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const renderCustomToolbarWithElements = useMemo(
      () =>
        getRenderCustomToolbarWithElements({
          leftSide: (
            <React.Fragment>
              <EuiText size="xs">
                <b>
                  <FormattedMessage
                    id="discover.esql_data_cascade.row.cell.toolbar.heading"
                    defaultMessage="{count, plural, =0 {no results} =1 {1 result} other {# results}}"
                    values={{ count: cellData.length }}
                  />
                </b>
              </EuiText>
            </React.Fragment>
          ),
        }),
      [cellData]
    );

    const setExpandedDocFn = useCallback(
      (...args: Parameters<NonNullable<UnifiedDataTableProps['setExpandedDoc']>>) =>
        setExpandedDoc(args[0]),
      [setExpandedDoc]
    );

    const derivedColumns = useMemo(() => [], []);

    return (
      <EuiPanel paddingSize="s">
        <UnifiedDataTable
          dataView={dataView}
          showTimeCol={showTimeCol}
          showKeyboardShortcuts={showKeyboardShortcuts}
          services={services}
          sort={[]}
          enableInTableSearch
          ariaLabelledBy="data-cascade-leaf-cell"
          consumer={`discover_esql_cascade_row_leaf_${cellId}`}
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={derivedColumns}
          onSetColumns={setVisibleColumns}
          sampleSizeState={sampleSize}
          renderCustomToolbar={renderCustomToolbarWithElements}
          onUpdateSampleSize={setSampleSize}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView={renderDocumentView}
          externalCustomRenderers={externalCustomRenderers}
        />
      </EuiPanel>
    );
  }
);
