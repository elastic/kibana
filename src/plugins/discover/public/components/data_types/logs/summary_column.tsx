/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ROWS_HEIGHT_OPTIONS, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VirtualColumnServiceProvider } from '../../../application/main/hooks/grid_customisations/use_virtual_column_services';
import { Resource } from '../../discover_grid/virtual_columns/logs/resource';
import { Content } from '../../discover_grid/virtual_columns/logs/content';

type SummaryColumnProps = DataGridCellValueElementProps;

interface SummaryColumnsGridParams {
  rowHeight: number | undefined;
}

export const getSummaryColumn =
  ({ data, params }: { data: DataPublicPluginStart; params: SummaryColumnsGridParams }) =>
  (props: SummaryColumnProps) => {
    const { dataView } = props;
    const { rowHeight } = params;
    const virtualColumnServices = { data, dataView };

    const isSingleLine = rowHeight === ROWS_HEIGHT_OPTIONS.single;
    const shouldCenter =
      rowHeight === ROWS_HEIGHT_OPTIONS.single || rowHeight === ROWS_HEIGHT_OPTIONS.auto;

    return (
      <VirtualColumnServiceProvider services={virtualColumnServices}>
        <EuiFlexGroup
          gutterSize="s"
          wrap={!isSingleLine}
          style={{ height: '100%' }}
          {...(shouldCenter && { alignItems: 'center' })}
        >
          <EuiFlexItem grow={false}>
            <Resource {...props} limited={isSingleLine} shouldCenter={shouldCenter} />
          </EuiFlexItem>
          <Content {...props} isSingleLine={isSingleLine} />
        </EuiFlexGroup>
      </VirtualColumnServiceProvider>
    );
  };
