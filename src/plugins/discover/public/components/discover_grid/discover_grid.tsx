/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
  SELECT_ROW,
  OPEN_DETAILS,
} from '@kbn/unified-data-table';
import { useProfileAccessor } from '../../context_awareness';

const REORDERED_CONTROL_COLUMN_IDS = [SELECT_ROW, OPEN_DETAILS];

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<UnifiedDataTableProps> = ({
  rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
  ...props
}) => {
  const getRowIndicatorProvider = useProfileAccessor('getRowIndicatorProvider');
  const getRowIndicator = useMemo(() => {
    return getRowIndicatorProvider(() => undefined)({ dataView: props.dataView });
  }, [getRowIndicatorProvider, props.dataView]);

  const getRowAdditionalLeadingControlsAccessor = useProfileAccessor(
    'getRowAdditionalLeadingControls'
  );
  const rowAdditionalLeadingControls = useMemo(() => {
    return getRowAdditionalLeadingControlsAccessor(() => customRowAdditionalLeadingControls)({
      dataView: props.dataView,
    });
  }, [getRowAdditionalLeadingControlsAccessor, props.dataView, customRowAdditionalLeadingControls]);

  return (
    <UnifiedDataTable
      showColumnTokens
      enableComparisonMode
      renderCustomToolbar={renderCustomToolbar}
      getRowIndicator={getRowIndicator}
      rowAdditionalLeadingControls={rowAdditionalLeadingControls}
      // TODO: remove after controls are swapped permanently https://github.com/elastic/kibana/issues/186808
      // By default we still render [expand, select] controls
      // The following line would swap to [select, expand] controls only if some additional controls are provided
      controlColumnIds={
        !props.controlColumnIds && rowAdditionalLeadingControls
          ? REORDERED_CONTROL_COLUMN_IDS
          : props.controlColumnIds
      }
      {...props}
    />
  );
};
