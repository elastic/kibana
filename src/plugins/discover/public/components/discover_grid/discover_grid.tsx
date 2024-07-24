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
  const getRowIndicatorProvider = useProfileAccessor('getRowIndicatorProvider');
  const getRowIndicator = useMemo(() => {
    return getRowIndicatorProvider(() => undefined)({ dataView: props.dataView });
  }, [getRowIndicatorProvider, props.dataView]);
  const [pinnedItems, setPinnedItems] = React.useState<Record<string, boolean>>({});

  return (
    <UnifiedDataTable
      showColumnTokens
      enableComparisonMode
      renderCustomToolbar={renderCustomToolbar}
      getRowIndicator={getRowIndicator}
      rowAdditionalLeadingControls={[
        {
          id: 'test1',
          headerAriaLabel: 'Additional row control header 1',
          renderControl: (Control, rowProps) => {
            return (
              <Control
                label="Test 1"
                iconType={pinnedItems[rowProps.record.id] ? 'pinFilled' : 'pin'}
                onClick={() => {
                  setPinnedItems((prev) => ({
                    ...prev,
                    [rowProps.record.id]: !prev[rowProps.record.id],
                  }));
                }}
              />
            );
          },
        },
        {
          id: 'test2',
          headerAriaLabel: 'Additional row control header 2',
          renderControl: (Control, rowProps) => {
            return (
              <Control
                label="Test 2"
                iconType="visBarVerticalStacked"
                onClick={() => {
                  alert('Test 2 clicked');
                }}
              />
            );
          },
        },
        {
          id: 'test',
          headerAriaLabel: 'Additional row control header 3',
          renderControl: (Control, rowProps) => {
            return (
              <Control
                label="Test 3"
                iconType="heart"
                onClick={() => {
                  alert('Test 3 clicked');
                }}
              />
            );
          },
        },
      ]}
      {...props}
    />
  );
};
