/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ToolbarSelector } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import type { Dimension, ParsedMetricItem } from '../../types';
import { METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ } from '../../common/constants';
import { useDimensionsSelector } from './hooks/use_dimensions_selector';

interface DimensionsSelectorProps {
  dimensions: Dimension[];
  selectedDimensions: Dimension[];
  fullWidth?: boolean;
  onChange: (dimensions: Dimension[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
  /**
   * When provided, the option list is filtered on the client to dimensions
   * carried by at least one metric that also carries every current selection,
   * preventing rapid multi-select from reaching an empty-grid state. Selected
   * dimensions not in the applicable set always stay visible regardless of
   * this prop (e.g. after URL restore).
   */
  metricItems?: ParsedMetricItem[];
}

export const DimensionsSelector = ({
  dimensions,
  selectedDimensions,
  onChange,
  fullWidth = false,
  singleSelection = false,
  isLoading = false,
  metricItems,
}: DimensionsSelectorProps) => {
  const {
    options,
    buttonLabel,
    buttonTooltipContent,
    popoverContentBelowSearch,
    handleChange,
    selectedValues,
  } = useDimensionsSelector({
    dimensions,
    selectedDimensions,
    onChange,
    singleSelection,
    isLoading,
    metricItems,
  });

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={selectedValues}
      searchable
      buttonLabel={buttonLabel}
      buttonTooltipContent={buttonTooltipContent}
      popoverContentBelowSearch={popoverContentBelowSearch}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={singleSelection}
      onChange={handleChange}
      fullWidth={fullWidth}
      hasArrow={!isLoading}
    />
  );
};
