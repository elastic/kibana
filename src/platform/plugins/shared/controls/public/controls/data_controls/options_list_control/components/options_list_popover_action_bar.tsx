/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { lastValueFrom, take } from 'rxjs';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { OptionsListSuggestions } from '../../../../../common/options_list';
import { getCompatibleSearchTechniques } from '../../../../../common/options_list/suggestions_searching';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopoverSortingButton } from './options_list_popover_sorting_button';
import { OptionsListStrings } from '../options_list_strings';
import { MAX_OPTIONS_LIST_BULK_SELECT_SIZE, MAX_OPTIONS_LIST_REQUEST_SIZE } from '../constants';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  disableMultiValueEmptySelection?: boolean;
}

const optionsListPopoverStyles = {
  actions: ({ euiTheme }: UseEuiTheme) => css`
    padding: 0 ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.backgroundLightText};
  `,
  searchInputRow: ({ euiTheme }: UseEuiTheme) => css`
    padding-top: ${euiTheme.size.s};
  `,
  cardinalityRow: ({ euiTheme }: UseEuiTheme) => css`
    margin: ${euiTheme.size.xs} 0 !important;
  `,
  borderDiv: ({ euiTheme }: UseEuiTheme) => css`
    height: ${euiTheme.size.base};
    border-right: ${euiTheme.border.thin};
  `,
  selectAllCheckbox: ({ euiTheme }: UseEuiTheme) => css`
    .euiCheckbox__square {
      margin-block-start: 0;
    }
    .euiCheckbox__label {
      align-items: center;
      padding-inline-start: ${euiTheme.size.xs};
    }
  `,
};

export const OptionsListPopoverActionBar = ({
  showOnlySelected,
  setShowOnlySelected,
  disableMultiValueEmptySelection = false,
}: OptionsListPopoverProps) => {
  const { componentApi, displaySettings } = useOptionsListContext();
  const [areAllSelected, setAllSelected] = useState<boolean>(false);

  // Using useStateFromPublishingSubject instead of useBatchedPublishingSubjects
  // to avoid debouncing input value
  const searchString = useStateFromPublishingSubject(componentApi.searchString$);

  const [
    searchTechnique,
    searchStringValid,
    selectedOptions = [],
    totalCardinality,
    field,
    fieldName,
    allowExpensiveQueries,
    availableOptions = [],
    dataLoading,
    singleSelect,
  ] = useBatchedPublishingSubjects(
    componentApi.searchTechnique$,
    componentApi.searchStringValid$,
    componentApi.selectedOptions$,
    componentApi.totalCardinality$,
    componentApi.field$,
    componentApi.fieldName$,
    componentApi.allowExpensiveQueries$,
    componentApi.availableOptions$,
    componentApi.dataLoading$,
    componentApi.singleSelect$
  );

  const compatibleSearchTechniques = useMemo(() => {
    if (!field) return [];
    return getCompatibleSearchTechniques(field.type);
  }, [field]);

  const defaultSearchTechnique = useMemo(
    () => searchTechnique ?? compatibleSearchTechniques[0],
    [searchTechnique, compatibleSearchTechniques]
  );

  const loadMoreOptions = useCallback(async (): Promise<OptionsListSuggestions | undefined> => {
    componentApi.setRequestSize(Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE));
    componentApi.loadMoreSubject.next(); // trigger refetch with loadMoreSubject
    return lastValueFrom(componentApi.availableOptions$.pipe(take(2)));
  }, [componentApi, totalCardinality]);

  const hasNoOptions = availableOptions.length < 1;
  const hasTooManyOptions = showOnlySelected
    ? selectedOptions.length > MAX_OPTIONS_LIST_BULK_SELECT_SIZE
    : totalCardinality > MAX_OPTIONS_LIST_BULK_SELECT_SIZE;

  const isEmptySelectionDisabled = disableMultiValueEmptySelection && areAllSelected;

  const isBulkSelectDisabled =
    dataLoading ||
    hasNoOptions ||
    hasTooManyOptions ||
    showOnlySelected ||
    isEmptySelectionDisabled;

  const handleBulkAction = useCallback(
    async (bulkAction: (keys: string[]) => void) => {
      bulkAction(availableOptions.map(({ value }) => value as string));

      if (totalCardinality > availableOptions.length) {
        const newAvailableOptions = (await loadMoreOptions()) ?? [];
        bulkAction(newAvailableOptions.map(({ value }) => value as string));
      }
    },
    [availableOptions, loadMoreOptions, totalCardinality]
  );

  useEffect(() => {
    if (availableOptions.some(({ value }) => !selectedOptions.includes(value as string))) {
      if (areAllSelected) {
        setAllSelected(false);
      }
    } else {
      if (!areAllSelected) {
        setAllSelected(true);
      }
    }
  }, [availableOptions, selectedOptions, areAllSelected]);
  const styles = useMemoCss(optionsListPopoverStyles);

  return (
    <div className="optionsList__actions" css={styles.actions}>
      {compatibleSearchTechniques.length > 0 && (
        <EuiFormRow fullWidth css={styles.searchInputRow}>
          <EuiFieldSearch
            isInvalid={!searchStringValid}
            compressed
            disabled={showOnlySelected}
            fullWidth
            onChange={(event) => {
              componentApi.setSearchString(event.target.value);
            }}
            value={searchString}
            data-test-subj="optionsList-control-search-input"
            placeholder={OptionsListStrings.popover.getSearchPlaceholder(
              allowExpensiveQueries ? defaultSearchTechnique : 'exact'
            )}
            aria-label={OptionsListStrings.popover.getSearchAriaLabel(fieldName)}
          />
        </EuiFormRow>
      )}
      <EuiFormRow fullWidth css={styles.cardinalityRow}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          {allowExpensiveQueries && (
            <>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="optionsList-cardinality-label">
                  {OptionsListStrings.popover.getCardinalityLabel(totalCardinality)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div css={styles.borderDiv} />
              </EuiFlexItem>
            </>
          )}
          {!singleSelect && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  hasTooManyOptions
                    ? OptionsListStrings.popover.getMaximumBulkSelectionTooltip()
                    : undefined
                }
              >
                <EuiCheckbox
                  checked={areAllSelected}
                  id={`optionsList-control-selectAll-checkbox-${componentApi.uuid}`}
                  // indeterminate={selectedOptions.length > 0 && !areAllSelected}
                  disabled={isBulkSelectDisabled}
                  data-test-subj="optionsList-control-selectAll"
                  onChange={() => {
                    if (areAllSelected) {
                      handleBulkAction(componentApi.deselectAll);
                      setAllSelected(false);
                    } else {
                      handleBulkAction(componentApi.selectAll);
                      setAllSelected(true);
                    }
                  }}
                  css={styles.selectAllCheckbox}
                  label={
                    <EuiText size="xs">
                      {OptionsListStrings.popover.getSelectAllButtonLabel()}
                    </EuiText>
                  }
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={
                    showOnlySelected
                      ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                      : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                  }
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    size="xs"
                    iconType="list"
                    aria-pressed={showOnlySelected}
                    color={showOnlySelected ? 'primary' : 'text'}
                    display={showOnlySelected ? 'base' : 'empty'}
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    data-test-subj="optionsList-control-show-only-selected"
                    aria-label={
                      showOnlySelected
                        ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                        : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {!displaySettings.hide_sort && (
                <EuiFlexItem grow={false}>
                  <OptionsListPopoverSortingButton showOnlySelected={showOnlySelected} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
};
