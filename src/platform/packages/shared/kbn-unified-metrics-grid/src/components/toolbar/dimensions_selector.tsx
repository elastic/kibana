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
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';

interface DimensionsFilterProps {
  fields: Array<{
    name: string;
    dimensions: Array<{ name: string; type: string; description?: string }>;
  }>;
  selectedDimensions: string[];
  fullWidth?: boolean;
  onChange: (dimensions: string[]) => void;
  singleSelection?: boolean;
}

export const DimensionsSelector = ({
  fields,
  selectedDimensions,
  onChange,
  fullWidth = false,
  singleSelection = false,
}: DimensionsFilterProps) => {
  // Extract all unique dimensions from fields that match the search term
  const allDimensions = useMemo(() => {
    const dimensionMap = new Map<string, { name: string; type: string; description?: string }>();

    fields
      .flatMap((field) => field.dimensions)
      .forEach((dimension) => {
        if (!dimensionMap.has(dimension.name)) {
          dimensionMap.set(dimension.name, dimension);
        }
      });

    return [...dimensionMap.values()].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [fields]);

  // Calculate which dimensions intersect with currently selected dimensions
  const intersectingDimensions = useMemo(() => {
    if (selectedDimensions.length === 0) {
      return new Set(allDimensions.map((d) => d.name));
    }

    const fieldDimensionSets = fields.map((f) => new Set(f.dimensions.map((d) => d.name)));
    const selectedSet = new Set(selectedDimensions);

    const result = new Set<string>();

    for (const dimSet of fieldDimensionSets) {
      if (dimSet.size < selectedSet.size) {
        continue;
      }

      let matches = true;
      for (const sel of selectedSet) {
        if (!dimSet.has(sel)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        dimSet.forEach((dim) => result.add(dim));
      }
    }
    return result;
  }, [fields, selectedDimensions, allDimensions]);

  const options: SelectableEntry[] = useMemo(() => {
    const isAtMaxLimit = selectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;
    return allDimensions.map<SelectableEntry>((dimension) => {
      const isSelected = selectedDimensions.includes(dimension.name);
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
  }, [allDimensions, selectedDimensions, intersectingDimensions, singleSelection]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry | SelectableEntry[]) => {
      const opts =
        chosenOption == null ? [] : Array.isArray(chosenOption) ? chosenOption : [chosenOption];
      const newSelection = opts.map((p) => p.value);
      // Enforce the maximum limit
      const limitedSelection = newSelection.slice(0, MAX_DIMENSIONS_SELECTIONS);
      onChange(limitedSelection);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    const count = selectedDimensions.length;
    const dimensionLabel = selectedDimensions[0];
    if (count === 0) {
      return (
        <FormattedMessage
          id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabel"
          defaultMessage="No {maxDimensions, plural, one {dimension} other {dimensions}} selected"
          values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
        />
      );
    }
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
          `}
        >
          <FormattedMessage
            id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
            defaultMessage="Breakdown by {dimensionLabel}"
            values={{ dimensionLabel }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [selectedDimensions]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={singleSelection}
      onChange={handleChange}
      fullWidth={fullWidth}
    />
  );
};
