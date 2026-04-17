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
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import type { Dimension, ParsedMetricItem } from '../../types';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
  DEBOUNCE_TIME,
} from '../../common/constants';
import { getOptionDisabledState } from './dimensions_selector_helpers';

interface DimensionsSelectorProps {
  dimensions: Dimension[];
  selectedDimensions: Dimension[];
  fullWidth?: boolean;
  onChange: (dimensions: Dimension[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
  /**
   * When provided, the option list is filtered on the client to dimensions
   * carried by at least one metric that also carries every current selection.
   * Prevents a rapid multi-select from reaching an empty-grid state before the
   * server fetch returns. Without it, options come straight from `dimensions`.
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
  const { euiTheme } = useEuiTheme();
  const [localSelectedDimensions, setLocalSelectedDimensions] =
    useState<Dimension[]>(selectedDimensions);

  useEffect(() => {
    setLocalSelectedDimensions(selectedDimensions);
  }, [selectedDimensions]);

  const selectedNamesSet = useMemo(
    () => new Set(localSelectedDimensions.map((d) => d.name)),
    [localSelectedDimensions]
  );

  // Names of dimensions still carried by at least one metric that has every
  // current selection. `null` means no client-side filter applies (either no
  // selection yet, or metricItems wasn't provided).
  const optimisticApplicableNames = useMemo(() => {
    if (!metricItems || localSelectedDimensions.length === 0) {
      return null;
    }
    const selectedNames = [...selectedNamesSet];
    const names = new Set<string>();
    for (const item of metricItems) {
      const itemDimNames = new Set(item.dimensionFields.map((d) => d.name));
      const hasAllSelected = selectedNames.every((name) => itemDimNames.has(name));
      if (!hasAllSelected) {
        continue;
      }
      for (const dim of item.dimensionFields) {
        names.add(dim.name);
      }
    }
    return names;
  }, [metricItems, localSelectedDimensions, selectedNamesSet]);

  const options: SelectableEntry[] = useMemo(() => {
    const isAtMaxLimit = localSelectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;

    const filteredDimensions =
      optimisticApplicableNames == null
        ? dimensions
        : dimensions.filter((dimension) => optimisticApplicableNames.has(dimension.name));

    const applicableNames = new Set(filteredDimensions.map((d) => d.name));

    // Selections no longer in the applicable set stay visible (prepended,
    // checked) so the count badge matches the rendered ticks and the user can
    // always deselect what they picked.
    const orphanSelections = localSelectedDimensions
      .filter((dimension) => !applicableNames.has(dimension.name))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const toOption = (dimension: Dimension): SelectableEntry => {
      const isSelected = selectedNamesSet.has(dimension.name);

      const isDisabled = getOptionDisabledState({
        singleSelection,
        isSelected,
        isAtMaxLimit,
      });

      const tooltipContent =
        isAtMaxLimit && isDisabled ? (
          <FormattedMessage
            id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
            defaultMessage="Maximum of {maxDimensions} dimensions selected"
            values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
          />
        ) : undefined;

      const option: SelectableEntry = {
        value: dimension.name,
        label: dimension.name,
        checked: isSelected ? 'on' : undefined,
        disabled: isDisabled,
        key: dimension.name,
      };

      if (tooltipContent) {
        option.append = (
          <EuiToolTip
            content={tooltipContent}
            position="top"
            anchorProps={{
              css: css`
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: auto;
                z-index: ${euiTheme.levels.menu};
              `,
            }}
          >
            <div />
          </EuiToolTip>
        );
      }

      return option;
    };

    // Orphan selections are prepended so they stay easy to find; the
    // applicable set keeps its caller-provided ordering below.
    return [...orphanSelections.map(toOption), ...filteredDimensions.map(toOption)];
  }, [
    dimensions,
    selectedNamesSet,
    localSelectedDimensions,
    singleSelection,
    euiTheme.levels.menu,
    optimisticApplicableNames,
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
      // Include local selections in the lookup so toggling another option
      // doesn't silently drop a selection that's no longer in `dimensions`.
      const dimensionByName = new Map<string, Dimension>();
      for (const dimension of localSelectedDimensions) {
        dimensionByName.set(dimension.name, dimension);
      }
      for (const dimension of dimensions) {
        dimensionByName.set(dimension.name, dimension);
      }
      const newSelection = opts
        .map((opt) => dimensionByName.get(opt.value))
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
    [onChange, dimensions, localSelectedDimensions, singleSelection, debouncedOnChange]
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
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
                  defaultMessage="Dimensions"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge>{count}</EuiNotificationBadge>
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

  // Create tooltip content for when at max dimensions
  const buttonTooltipContent = useMemo(() => {
    const count = localSelectedDimensions.length;
    const isAtMaxDimensions = count >= MAX_DIMENSIONS_SELECTIONS;

    if (isAtMaxDimensions) {
      return (
        <FormattedMessage
          id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
          defaultMessage="Maximum of {maxDimensions} dimensions selected"
          values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
        />
      );
    }

    return undefined;
  }, [localSelectedDimensions]);

  const popoverContentBelowSearch = useMemo(() => {
    const count = localSelectedDimensions.length;
    return (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup
          gutterSize="xs"
          css={css`
            min-height: ${euiTheme.size.l};
          `}
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
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
          {count > 0 && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" flush="right" onClick={handleClearAll}>
                <FormattedMessage
                  id="metricsExperience.dimensionsSelector.clearSelection"
                  defaultMessage="Clear selection"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    );
  }, [localSelectedDimensions.length, handleClearAll, euiTheme.size.l]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={[...selectedNamesSet]}
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
