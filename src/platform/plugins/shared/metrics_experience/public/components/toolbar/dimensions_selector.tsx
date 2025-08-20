/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import type { SelectableEntry } from '@kbn/unified-histogram';
import { ToolbarSelector } from '@kbn/unified-histogram';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';

interface DimensionsFilterProps {
  fields: Array<{
    name: string;
    dimensions: Array<{ name: string; type: string; description?: string }>;
  }>;
  selectedDimensions: string[];
  onChange: (dimensions: string[]) => void;
}

export const DimensionsSelector = ({
  fields,
  selectedDimensions,
  onChange,
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

    const result = new Set<string>();

    for (const field of fields) {
      if (selectedDimensions.every((sel) => field.dimensions.some((dim) => dim.name === sel))) {
        for (const dimension of field.dimensions) {
          result.add(dimension.name);
        }
      }
    }

    return result;
  }, [fields, selectedDimensions, allDimensions]);

  const options: SelectableEntry[] = useMemo(() => {
    return allDimensions.map<SelectableEntry>((dimension) => ({
      value: dimension.name,
      label: dimension.name,
      checked: selectedDimensions.includes(dimension.name) ? 'on' : undefined,
      disabled: !intersectingDimensions.has(dimension.name),
      toolTipContent: dimension.description,
      key: dimension.name,
    }));
  }, [allDimensions, selectedDimensions, intersectingDimensions]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry[] | undefined) => {
      onChange(chosenOption?.map((p) => p.value) ?? []);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    if (selectedDimensions.length === 0) {
      return (
        <FormattedMessage
          id="metricsExperience.breakdownFieldSelector.breakdownFieldButtonLabel"
          defaultMessage="No dimensions selected"
        />
      );
    }
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="metricsExperience.breakdownFieldSelector.breakdownFieldButtonLabelWithSelection"
            defaultMessage="Dimensions"
            values={{
              count: selectedDimensions.length,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{selectedDimensions.length}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [selectedDimensions]);

  return (
    <ToolbarSelector
      data-test-subj="metricsExperienceBreakdownSelector"
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={({ option, normalizedSearchValue }) => {
        return 'name' in option
          ? String(option.name ?? '').includes(normalizedSearchValue)
          : option.label.includes(normalizedSearchValue);
      }}
      options={options}
      singleSelection={false}
      anchorPosition="downCenter"
      onChange={handleChange}
    />
  );
};
