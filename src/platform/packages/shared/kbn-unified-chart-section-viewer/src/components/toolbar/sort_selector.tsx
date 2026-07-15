/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ToolbarSelector } from '@kbn/shared-ux-toolbar-selector';
import type { MetricsSort } from '../../types';
import { useSortSelector } from './hooks/use_sort_selector';
import { SortDirectionToggle } from './sort_selector_helpers';

interface SortSelectorProps {
  sort: MetricsSort;
  onChange: (sort: MetricsSort) => void;
  fullWidth?: boolean;
}

export const SortSelector = ({ sort, onChange, fullWidth = false }: SortSelectorProps) => {
  const { options, buttonLabel, selectedValue, handleSortByChange, handleDirectionChange } =
    useSortSelector({ sort, onChange });
  const [, direction] = sort;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={fullWidth}>
        <ToolbarSelector
          data-test-subj="metricsExperienceSortSelector"
          data-selected-value={selectedValue}
          searchable={false}
          buttonLabel={buttonLabel}
          options={options}
          singleSelection
          onChange={handleSortByChange}
          fullWidth={fullWidth}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SortDirectionToggle direction={direction} onChange={handleDirectionChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
