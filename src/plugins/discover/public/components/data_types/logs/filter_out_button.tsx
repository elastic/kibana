/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDataGridCellServicesContext } from '../../../application/main/hooks/grid_customisations/use_data_grid_cell_services';
import { actionFilterOutText, filterOutText } from './translations';

export const FilterOutButton = ({ property, value }: { property: string; value: string }) => {
  const ariaFilterOutText = actionFilterOutText(value);
  const serviceContext = useDataGridCellServicesContext();
  const filterManager = serviceContext?.data.query.filterManager;
  const dataView = serviceContext.dataView;

  const onFilterOutAction = () => {
    if (filterManager != null) {
      const filter = generateFilters(filterManager, property, [value], '-', dataView);
      filterManager.addFilters(filter);
    }
  };

  return (
    <EuiButtonEmpty
      key="removeFromFilterAction"
      size="s"
      iconType="minusInCircle"
      aria-label={ariaFilterOutText}
      onClick={onFilterOutAction}
      data-test-subj={`dataTableCellAction_removeFromFilterAction_${property}`}
    >
      {filterOutText}
    </EuiButtonEmpty>
  );
};
