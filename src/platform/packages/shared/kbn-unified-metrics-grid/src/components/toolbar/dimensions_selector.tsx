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
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { ClearAllSection } from './clear_all_section';

interface DimensionsFilterProps {
  fields: Array<{
    name: string;
    dimensions: Array<{ name: string; type: string; description?: string }>;
  }>;
  selectedDimensions: string[];
  onChange: (dimensions: string[]) => void;
  onClear: () => void;
}

export const DimensionsSelector = ({
  fields,
  selectedDimensions,
  onChange,
  onClear,
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
    (chosenOption?: SelectableEntry[]) => {
      onChange(chosenOption?.map((p) => p.value) ?? []);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    if (selectedDimensions.length === 0) {
      return (
        <FormattedMessage
          id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabel"
          defaultMessage="No dimensions selected"
        />
      );
    }
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
            defaultMessage="Dimensions"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{selectedDimensions.length}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [selectedDimensions]);

  const popoverContentBelowSearch = useMemo(() => {
    return (
      <ClearAllSection
        selectedOptionsLength={selectedDimensions.length}
        onClearAllAction={onClear}
        selectedOptionsMessage={i18n.translate(
          'metricsExperience.dimensionsSelector.selectedStatusMessage',
          {
            defaultMessage:
              '{count, plural, one {# dimension selected} other {# dimensions selected}}',
            values: { count: selectedDimensions.length },
          }
        )}
      />
    );
  }, [onClear, selectedDimensions.length]);

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
      onChange={handleChange}
      popoverContentBelowSearch={popoverContentBelowSearch}
    />
  );
};
