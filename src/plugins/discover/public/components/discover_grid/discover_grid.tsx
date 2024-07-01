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
} from '@kbn/unified-data-table';
import { useProfileAccessor } from '../../context_awareness';

/**
 * Customized version of the UnifiedDataTable
 * @param props
 * @constructor
 */
export const DiscoverGrid: React.FC<UnifiedDataTableProps> = (props) => {
  const getRowIndicatorColorAccessor = useProfileAccessor('getRowIndicatorColor');
  const getRowIndicatorColor = useMemo(() => {
    return getRowIndicatorColorAccessor(undefined);
  }, [getRowIndicatorColorAccessor]);

  return (
    <UnifiedDataTable
      showColumnTokens
      enableComparisonMode
      renderCustomToolbar={renderCustomToolbar}
      getRowIndicatorColor={getRowIndicatorColor}
      {...props}
    />
  );
};
