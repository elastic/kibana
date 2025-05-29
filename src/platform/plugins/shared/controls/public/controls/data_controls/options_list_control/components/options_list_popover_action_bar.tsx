/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { lastValueFrom, take } from 'rxjs';
import { OptionsListSuggestions } from '../../../../../common/options_list';
import { getCompatibleSearchTechniques } from '../../../../../common/options_list/suggestions_searching';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopoverSortingButton } from './options_list_popover_sorting_button';
import { OptionsListStrings } from '../options_list_strings';
import { MAX_OPTIONS_LIST_BULK_SELECT_SIZE, MAX_OPTIONS_LIST_REQUEST_SIZE } from '../constants';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
}

export const OptionsListPopoverActionBar = ({
  showOnlySelected,
  setShowOnlySelected,
}: OptionsListPopoverProps) => {
  const { componentApi, displaySettings } = useOptionsListContext();

  // Using useStateFromPublishingSubject instead of useBatchedPublishingSubjects
  // to avoid debouncing input value
  const searchString = useStateFromPublishingSubject(componentApi.searchString$);

  const [
    searchTechnique,
    searchStringValid,
    selectedOptions = [],
    invalidSelections,
    totalCardinality,
    field,
    allowExpensiveQueries,
    availableOptions = [],
  ] = useBatchedPublishingSubjects(
    componentApi.searchTechnique$,
    componentApi.searchStringValid$,
    componentApi.selectedOptions$,
    componentApi.invalidSelections$,
    componentApi.totalCardinality$,
    componentApi.field$,
    componentApi.parentApi.allowExpensiveQueries$,
    componentApi.availableOptions$
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

  const hasNoOptions = availableOptions.length < 1 || totalCardinality < 1;
  const hasTooManyOptions = showOnlySelected
    ? selectedOptions.length > MAX_OPTIONS_LIST_BULK_SELECT_SIZE
    : totalCardinality > MAX_OPTIONS_LIST_BULK_SELECT_SIZE;

  const isBulkSelectDisabled = hasNoOptions || hasTooManyOptions || showOnlySelected;

  const handleBulkAction = useCallback(
    async (bulkAction: (keys: string[]) => void) => {
      if (totalCardinality > availableOptions.length) {
        const newAvailableOptions = (await loadMoreOptions()) ?? [];
        bulkAction(newAvailableOptions.map(({ value }) => value as string));
      } else {
        bulkAction(availableOptions.map(({ value }) => value as string));
      }
    },
    [availableOptions, loadMoreOptions, totalCardinality]
  );

  return (
    <div className="optionsList__actions">
      {compatibleSearchTechniques.length > 0 && (
        <EuiFormRow className="optionsList__searchRow" fullWidth>
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
          />
        </EuiFormRow>
      )}
      <EuiFormRow className="optionsList__actionsRow" fullWidth>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          {allowExpensiveQueries && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="optionsList-cardinality-label">
                {OptionsListStrings.popover.getCardinalityLabel(totalCardinality)} |{' '}
                <EuiToolTip
                  content={
                    hasTooManyOptions
                      ? OptionsListStrings.popover.getMaximumBulkSelectionTooltip()
                      : undefined
                  }
                >
                  <EuiLink
                    disabled={isBulkSelectDisabled}
                    data-test-subj="optionsList-control-selectAll"
                    onClick={() => handleBulkAction(componentApi.selectAll)}
                  >
                    {OptionsListStrings.popover.getSelectAllButtonLabel()}
                  </EuiLink>
                </EuiToolTip>
                {' | '}
                <EuiToolTip
                  content={
                    hasTooManyOptions
                      ? OptionsListStrings.popover.getMaximumBulkSelectionTooltip()
                      : undefined
                  }
                >
                  <EuiLink
                    disabled={isBulkSelectDisabled}
                    data-test-subj="optionsList-control-deselectAll"
                    onClick={() => handleBulkAction(componentApi.deselectAll)}
                  >
                    {OptionsListStrings.popover.getDeselectAllButtonLabel()}
                  </EuiLink>
                </EuiToolTip>
              </EuiText>
            </EuiFlexItem>
          )}
          {invalidSelections && invalidSelections.size > 0 && (
            <>
              {allowExpensiveQueries && (
                <EuiFlexItem grow={false}>
                  <div className="optionsList__actionBarDivider" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {OptionsListStrings.popover.getInvalidSelectionsLabel(invalidSelections.size)}
                </EuiText>
              </EuiFlexItem>
            </>
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
              {!displaySettings.hideSort && (
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
