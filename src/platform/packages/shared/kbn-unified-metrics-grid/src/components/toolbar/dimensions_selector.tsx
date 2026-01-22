/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { Dimension } from '../../types';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';

interface DimensionsSelectorProps {
  fields: Array<{ dimensions: Dimension[] }>;
  dimensions: Dimension[];
  selectedDimensions: Dimension[];
  fullWidth?: boolean;
  onChange: (dimensions: Dimension[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
}

export const DimensionsSelector = ({
  fields,
  dimensions,
  selectedDimensions,
  onChange,
  fullWidth = false,
  singleSelection = false,
  isLoading = false,
}: DimensionsSelectorProps) => {
  const selectedNamesSet = useMemo(
    () => new Set(selectedDimensions.map((d) => d.name)),
    [selectedDimensions]
  );

  const intersectingDimensions = useMemo(() => {
    if (selectedNamesSet.size === 0) {
      return new Set(dimensions.map((d) => d.name));
    }

    const result = new Set<string>();
    for (const field of fields) {
      const fieldDimNames = new Set(field.dimensions.map((d) => d.name));

      if (fieldDimNames.size < selectedNamesSet.size) {
        continue;
      }

      let hasAllSelected = true;
      for (const sel of selectedNamesSet) {
        if (!fieldDimNames.has(sel)) {
          hasAllSelected = false;
          break;
        }
      }

      if (hasAllSelected) {
        fieldDimNames.forEach((name) => result.add(name));
      }
    }

    return result;
  }, [fields, selectedNamesSet, dimensions]);

  const options: SelectableEntry[] = useMemo(() => {
    const isAtMaxLimit = selectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;
    return dimensions.map<SelectableEntry>((dimension) => {
      const isSelected = selectedNamesSet.has(dimension.name);
      const isIntersecting = intersectingDimensions.has(dimension.name);
      const isDisabledByLimit = singleSelection ? false : !isSelected && isAtMaxLimit;

      return {
        value: dimension.name,
        label: dimension.name,
        checked: isSelected ? 'on' : undefined,
        // In single-selection mode, don't check intersections since we're replacing, not adding
        disabled: singleSelection ? false : !isIntersecting || isDisabledByLimit,
        key: dimension.name,
      };
    });
  }, [
    dimensions,
    selectedNamesSet,
    selectedDimensions.length,
    intersectingDimensions,
    singleSelection,
  ]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry | SelectableEntry[]) => {
      const opts =
        chosenOption == null ? [] : Array.isArray(chosenOption) ? chosenOption : [chosenOption];
      const selectedValues = new Set(opts.map((p) => p.value));
      const newSelection = dimensions.filter((d) => selectedValues.has(d.name));
      // Enforce the maximum limit
      const limitedSelection = newSelection.slice(0, MAX_DIMENSIONS_SELECTIONS);
      onChange(limitedSelection);
    },
    [onChange, dimensions]
  );

  const buttonLabel = useMemo(() => {
    const count = selectedDimensions.length;
    const dimensionLabel = selectedDimensions[0]?.name;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
          `}
        >
          {count === 0 ? (
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabel"
              defaultMessage="No {maxDimensions, plural, one {dimension} other {dimensions}} selected"
              values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
            />
          ) : (
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
              defaultMessage="Breakdown by {dimensionLabel}"
              values={{ dimensionLabel }}
            />
          )}
        </EuiFlexItem>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [selectedDimensions, isLoading]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={[...selectedNamesSet]}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={singleSelection}
      onChange={handleChange}
      fullWidth={fullWidth}
      hasArrow={!isLoading}
    />
  );
};
