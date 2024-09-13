/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDataGridCellServicesContext } from '../../../application/main/hooks/grid_customisations/use_data_grid_cell_services';
import { actionFilterForText, filterForText } from './translations';

export const FilterInButton = ({ property, value }: { property: string; value: string }) => {
  const ariaFilterForText = actionFilterForText(value);
  const serviceContext = useDataGridCellServicesContext();
  const filterManager = serviceContext?.data.query.filterManager;
  const dataView = serviceContext.dataView;

  const onFilterForAction = () => {
    if (filterManager != null) {
      const filter = generateFilters(filterManager, property, [value], '+', dataView);
      filterManager.addFilters(filter);
    }
  };

  return (
    <EuiButtonEmpty
      key="addToFilterAction"
      size="s"
      iconType="plusInCircle"
      aria-label={ariaFilterForText}
      onClick={onFilterForAction}
      data-test-subj={`dataTableCellAction_addToFilterAction_${property}`}
    >
      {filterForText}
    </EuiButtonEmpty>
  );
};
