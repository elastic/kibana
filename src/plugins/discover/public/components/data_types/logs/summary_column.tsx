/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VirtualColumnServiceProvider } from '../../../application/main/hooks/grid_customisations/use_virtual_column_services';
import { Resource } from '../../discover_grid/virtual_columns/logs/resource';
import { Content } from '../../discover_grid/virtual_columns/logs/content';

type SummaryColumnProps = DataGridCellValueElementProps;

export const getSummaryColumn =
  ({ data }: { data: DataPublicPluginStart }) =>
  (props: SummaryColumnProps) => {
    const { dataView } = props;

    const virtualColumnServices = {
      data,
      dataView,
    };

    return (
      <VirtualColumnServiceProvider services={virtualColumnServices}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <Resource {...props} />
          </EuiFlexItem>
          <Content {...props} />
        </EuiFlexGroup>
      </VirtualColumnServiceProvider>
    );
  };
