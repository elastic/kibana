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
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { ClearAllSection } from './clear_all_section';
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
    const isAtMaxLimit = selectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;
    return allDimensions.map<SelectableEntry>((dimension) => {
      const isSelected = selectedDimensions.includes(dimension.name);
      const isIntersecting = intersectingDimensions.has(dimension.name);
      const isDisabledByLimit =
        MAX_DIMENSIONS_SELECTIONS === 1 ? false : !isSelected && isAtMaxLimit;

      return {
        value: dimension.name,
        label: dimension.name,
        checked: isSelected ? 'on' : undefined,
        // In single-selection mode, don't check intersections since we're replacing, not adding
        disabled: MAX_DIMENSIONS_SELECTIONS === 1 ? false : !isIntersecting || isDisabledByLimit,
        key: dimension.name,
      };
    });
  }, [allDimensions, selectedDimensions, intersectingDimensions]);

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
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
            defaultMessage="{count, plural, one {Dimension} other {Dimensions}}"
            values={{ count }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{count}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [selectedDimensions]);

  const popoverContentBelowSearch = useMemo(() => {
    const count = selectedDimensions.length;
    const isAtMaxLimit = count >= MAX_DIMENSIONS_SELECTIONS;

    let statusMessage: string;
    if (MAX_DIMENSIONS_SELECTIONS > 1 && isAtMaxLimit) {
      statusMessage = i18n.translate('metricsExperience.dimensionsSelector.maxLimitStatusMessage', {
        defaultMessage: 'Maximum of {maxDimensions} dimensions selected ({count}/{maxDimensions})',
        values: { count, maxDimensions: MAX_DIMENSIONS_SELECTIONS },
      });
    } else if (MAX_DIMENSIONS_SELECTIONS > 1 && count > 0) {
      statusMessage = i18n.translate('metricsExperience.dimensionsSelector.selectedStatusMessage', {
        defaultMessage: '{count, plural, one {# dimension selected} other {# dimensions selected}}',
        values: { count },
      });
    } else {
      statusMessage = i18n.translate('metricsExperience.dimensionsSelector.instructionMessage', {
        defaultMessage:
          'Select {maxDimensions, plural, one {a dimension} other {dimensions}} to break down your metrics',
        values: { maxDimensions: MAX_DIMENSIONS_SELECTIONS },
      });
    }

    return (
      <ClearAllSection
        selectedOptionsLength={count}
        onClearAllAction={onClear}
        selectedOptionsMessage={statusMessage}
      />
    );
  }, [onClear, selectedDimensions.length]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={MAX_DIMENSIONS_SELECTIONS === 1}
      onChange={handleChange}
      popoverContentBelowSearch={popoverContentBelowSearch}
    />
  );
};
