/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataGridCellServicesProvider } from '../../../../application/main/hooks/grid_customisations/use_data_grid_cell_services';
import { CONTENT_FIELD, RESOURCE_FIELD } from '../../../../../common/data_types/logs/constants';
import { Content } from './content';
import { Resource } from './resource';

export const renderCell =
  (type: string, { data }: { data: DataPublicPluginStart }) =>
  (props: DataGridCellValueElementProps) => {
    const { dataView } = props;
    const virtualColumnServices = {
      data,
      dataView,
    };

    let renderedCell = null;

    switch (type) {
      case CONTENT_FIELD:
        renderedCell = <Content {...props} />;
        break;
      case RESOURCE_FIELD:
        renderedCell = <Resource {...props} />;
        break;
      default:
        break;
    }

    return (
      <DataGridCellServicesProvider services={virtualColumnServices}>
        {renderedCell}
      </DataGridCellServicesProvider>
    );
  };
