/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { useProfileAccessor } from '../../context_awareness';

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
      {...props}
    />
  );
};
