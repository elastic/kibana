/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import type { Dimension, ParsedMetricItem } from '../../../types';
import { DEBOUNCE_TIME, MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';
import {
  buildDimensionOption,
  getApplicableDimensionNames,
  getOptionDisabledState,
  partitionDimensionsForRender,
} from '../dimensions_selector_helpers';
import type { DimensionEntry } from '../dimensions_selector_helpers';

interface UseDimensionsSelectorParams {
  dimensions: Dimension[];
  selectedDimensions: Dimension[];
  onChange: (dimensions: Dimension[]) => void;
  singleSelection: boolean;
  isLoading: boolean;
  metricItems?: ParsedMetricItem[];
}

export interface UseDimensionsSelectorResult {
  options: SelectableEntry[];
  buttonLabel: ReactElement;
  buttonTooltipContent: ReactElement | undefined;
  popoverContentBelowSearch: ReactElement;
  handleChange: (chosenOption?: SelectableEntry | SelectableEntry[]) => void;
  selectedValues: string[];
}

/**
 * Encapsulates the dimensions picker's business logic so the component can
 * stay presentational. Owns:
 *   - local selection state (mirrors the controlled prop, lets the UI render
 *     optimistically while the debounced onChange catches up)
 *   - the optimistic applicable-dimension filter derived from `metricItems`
 *   - assembly of the `SelectableEntry[]` (orphans prepended, disabled-state
 *     tooltip)
 *   - change + clear handlers (debounced for multi-select, immediate for
 *     single)
 *   - the button label, tooltip, and popover footer nodes
 */
export const useDimensionsSelector = ({
  dimensions,
  selectedDimensions,
  onChange,
  singleSelection,
  isLoading,
  metricItems,
}: UseDimensionsSelectorParams): UseDimensionsSelectorResult => {
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
    if (!metricItems || selectedNamesSet.size === 0) {
      return null;
    }
    return getApplicableDimensionNames(metricItems, [...selectedNamesSet]);
  }, [metricItems, selectedNamesSet]);

  const options = useMemo<DimensionEntry[]>(() => {
    const isAtMaxLimit = localSelectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;

    const { orphanSelections, applicableDimensions } = partitionDimensionsForRender({
      dimensions,
      selectedDimensions: localSelectedDimensions,
      optimisticApplicableNames,
    });

    const toOption = (dimension: Dimension): DimensionEntry => {
      const isSelected = selectedNamesSet.has(dimension.name);
      const isDisabled = getOptionDisabledState({ singleSelection, isSelected, isAtMaxLimit });
      const showMaxTooltip = isAtMaxLimit && isDisabled;

      return buildDimensionOption({
        dimension,
        isSelected,
        isDisabled,
        appendNode: showMaxTooltip ? (
          <EuiToolTip
            content={
              <FormattedMessage
                id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
                defaultMessage="Maximum of {maxDimensions} dimensions selected"
                values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
              />
            }
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
        ) : undefined,
      });
    };

    // Orphan selections are prepended so they stay easy to find; the
    // applicable set keeps its caller-provided ordering below.
    return [...orphanSelections.map(toOption), ...applicableDimensions.map(toOption)];
  }, [
    dimensions,
    localSelectedDimensions,
    optimisticApplicableNames,
    selectedNamesSet,
    singleSelection,
    euiTheme.levels.menu,
  ]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create debounced onChange only for multi-selection mode.
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

      // Each option carries its source `Dimension` (see `buildDimensionOption`),
      // so we can read it straight off the option and skip the reverse lookup
      // against `dimensions` + `localSelectedDimensions` that would otherwise
      // be needed to recover selections no longer present in `dimensions`.
      const newSelection = (opts as DimensionEntry[])
        .map((opt) => opt.dimension)
        .filter((d): d is Dimension => d !== undefined)
        .slice(0, MAX_DIMENSIONS_SELECTIONS);

      if (singleSelection || !debouncedOnChange) {
        setLocalSelectedDimensions(newSelection);
        onChange(newSelection);
        return;
      }

      setLocalSelectedDimensions(newSelection);
      debouncedOnChange.cancel();
      debouncedOnChange(newSelection);
    },
    [onChange, singleSelection, debouncedOnChange]
  );

  const handleClearAll = useCallback(() => {
    if (debouncedOnChange) {
      debouncedOnChange.cancel();
    }
    setLocalSelectedDimensions([]);
    onChange([]);
  }, [onChange, debouncedOnChange]);

  const buttonLabel = useMemo<ReactElement>(() => {
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

  const buttonTooltipContent = useMemo<ReactElement | undefined>(() => {
    const count = localSelectedDimensions.length;
    const isAtMaxDimensions = count >= MAX_DIMENSIONS_SELECTIONS;

    if (!isAtMaxDimensions) {
      return undefined;
    }

    return (
      <FormattedMessage
        id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
        defaultMessage="Maximum of {maxDimensions} dimensions selected"
        values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
      />
    );
  }, [localSelectedDimensions]);

  const popoverContentBelowSearch = useMemo<ReactElement>(() => {
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

  const selectedValues = useMemo(() => [...selectedNamesSet], [selectedNamesSet]);

  return {
    options,
    buttonLabel,
    buttonTooltipContent,
    popoverContentBelowSearch,
    handleChange,
    selectedValues,
  };
};
