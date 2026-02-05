/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiText,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import type { Dimension } from '../../types';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
  DEBOUNCE_TIME,
} from '../../common/constants';
import { getOptionDisabledState, sortDimensionOptions } from './dimensions_selector_helpers';

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
  const [localSelectedDimensions, setLocalSelectedDimensions] =
    useState<Dimension[]>(selectedDimensions);

  useEffect(() => {
    setLocalSelectedDimensions(selectedDimensions);
  }, [selectedDimensions]);

  const selectedNamesSet = useMemo(
    () => new Set(localSelectedDimensions.map((d) => d.name)),
    [localSelectedDimensions]
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
    const isAtMaxLimit = localSelectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;

    const mappedOptions = dimensions.map<SelectableEntry>((dimension) => {
      const isSelected = selectedNamesSet.has(dimension.name);
      const isIntersecting = intersectingDimensions.has(dimension.name);

      return {
        value: dimension.name,
        label: dimension.name,
        checked: isSelected ? 'on' : undefined,
        disabled: getOptionDisabledState({
          singleSelection,
          isSelected,
          isIntersecting,
          isAtMaxLimit,
        }),
        key: dimension.name,
      };
    });

    return sortDimensionOptions(mappedOptions, localSelectedDimensions);
  }, [
    dimensions,
    selectedNamesSet,
    localSelectedDimensions,
    intersectingDimensions,
    singleSelection,
  ]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create debounced onChange only for multi-selection mode
  const debouncedOnChange = useMemo(() => {
    if (singleSelection) {
      return null;
    }
    return debounce((dim: Dimension[]) => {
      onChangeRef.current(dim);
    }, DEBOUNCE_TIME);
  }, [singleSelection]);

  useEffect(() => {
    return () => {
      if (debouncedOnChange) {
        debouncedOnChange.cancel();
      }
    };
  }, [debouncedOnChange]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry | SelectableEntry[]) => {
      const opts =
        chosenOption == null ? [] : Array.isArray(chosenOption) ? chosenOption : [chosenOption];
      const newSelection = opts
        .map((opt) => dimensions.find((d) => d.name === opt.value))
        .filter((d): d is Dimension => d !== undefined)
        .slice(0, MAX_DIMENSIONS_SELECTIONS);

      // For single selection, call onChange immediately
      if (singleSelection || !debouncedOnChange) {
        setLocalSelectedDimensions(newSelection);
        onChange(newSelection);
      } else {
        setLocalSelectedDimensions(newSelection);
        debouncedOnChange.cancel();
        debouncedOnChange(newSelection);
      }
    },
    [onChange, dimensions, singleSelection, debouncedOnChange]
  );

  const handleClearAll = useCallback(() => {
    if (debouncedOnChange) {
      debouncedOnChange.cancel();
    }

    setLocalSelectedDimensions([]);
    onChange([]);
  }, [onChange, debouncedOnChange]);

  const buttonLabel = useMemo(() => {
    const count = localSelectedDimensions.length;
    const isAtMaxDimensions = count >= MAX_DIMENSIONS_SELECTIONS;

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
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
                  defaultMessage="Dimensions"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isAtMaxDimensions ? (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
                        defaultMessage="Maximum of {maxDimensions} dimensions selected"
                        values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
                      />
                    }
                  >
                    <EuiNotificationBadge>{count}</EuiNotificationBadge>
                  </EuiToolTip>
                ) : (
                  <EuiNotificationBadge>{count}</EuiNotificationBadge>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [localSelectedDimensions, isLoading]);

  const popoverContentBelowSearch = useMemo(() => {
    const count = localSelectedDimensions.length;
    if (count === 0) {
      return undefined;
    }
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        css={css`
          padding: 8px 0;
        `}
      >
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.selectedDimensionsCount"
              defaultMessage="{count, plural, one {# dimension selected} other {# dimensions selected}}"
              values={{ count }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty size="xs" flush="left" onClick={handleClearAll}>
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.clearSelection"
              defaultMessage="Clear selection"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [localSelectedDimensions.length, handleClearAll]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={[...selectedNamesSet]}
      searchable
      buttonLabel={buttonLabel}
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
