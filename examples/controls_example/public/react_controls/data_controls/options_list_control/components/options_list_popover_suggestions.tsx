/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EuiHighlight, EuiSelectable } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';

import { ControlStateManager } from '../../../types';
import { MAX_OPTIONS_LIST_REQUEST_SIZE } from '../constants';
import { OptionsListComponentApi, OptionsListComponentState } from '../types';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';
import { OptionsListStrings } from './options_list_strings';

interface OptionsListPopoverSuggestionsProps {
  api: OptionsListComponentApi;
  stateManager: ControlStateManager<OptionsListComponentState>;
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  api,
  stateManager,
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  const [
    sort,
    searchString,
    existsSelected,
    singleSelect,
    searchTechnique,
    selectedOptions,
    invalidSelections,
    availableOptions,
    totalCardinality,
    fieldSpec,
    loading,
    allowExpensiveQueries,
    fieldFormatter,
  ] = useBatchedPublishingSubjects(
    stateManager.sort,
    stateManager.searchString,
    stateManager.existsSelected,
    stateManager.singleSelect,
    stateManager.searchTechnique,
    stateManager.selectedOptions,
    api.invalidSelections$,
    api.availableOptions$,
    api.totalCardinality$,
    api.fieldSpec,
    api.dataLoading,
    api.allowExpensiveQueries$,
    api.fieldFormatter
  );

  const listRef = useRef<HTMLDivElement>(null);

  const canLoadMoreSuggestions = useMemo<boolean>(
    () =>
      allowExpensiveQueries && totalCardinality && !showOnlySelected // && searchString.valid
        ? (availableOptions ?? []).length <
          Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE)
        : false,
    [availableOptions, totalCardinality, showOnlySelected, allowExpensiveQueries]
  );

  const suggestions = useMemo<OptionsListSuggestions>(() => {
    return showOnlySelected ? selectedOptions : availableOptions ?? [];
  }, [availableOptions, selectedOptions, showOnlySelected]);

  const existsSelectableOption = useMemo<EuiSelectableOption | undefined>(() => {
    // if (hideExists || (!existsSelected && (showOnlySelected || suggestions?.length === 0))) return;
    if (!existsSelected && (showOnlySelected || suggestions?.length === 0)) return;

    return {
      key: 'exists-option',
      checked: existsSelected ? 'on' : undefined,
      label: OptionsListStrings.controlAndPopover.getExists(),
      className: 'optionsList__existsFilter',
      'data-test-subj': 'optionsList-control-selection-exists',
    };
  }, [suggestions, existsSelected, showOnlySelected]);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const options: EuiSelectableOption[] = (suggestions ?? []).map((suggestion) => {
      if (typeof suggestion !== 'object') {
        // this means that `showOnlySelected` is true, and doc count is not known when this is the case
        suggestion = { value: suggestion };
      }

      return {
        key: suggestion.value,
        label: fieldFormatter(suggestion.value) ?? suggestion.value,
        checked: (selectedOptions ?? []).includes(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
        className:
          showOnlySelected && invalidSelections.has(suggestion.value)
            ? 'optionsList__selectionInvalid'
            : 'optionsList__validSuggestion',
        append:
          !showOnlySelected && suggestion?.docCount ? (
            <OptionsListPopoverSuggestionBadge documentCount={suggestion.docCount} />
          ) : undefined,
      } as EuiSelectableOption;
    });

    if (canLoadMoreSuggestions) {
      options.push({
        key: 'loading-option',
        className: 'optionslist--loadingMoreGroupLabel',
        label: OptionsListStrings.popover.getLoadingMoreMessage(),
        isGroupLabel: true,
      });
    } else if (options.length === MAX_OPTIONS_LIST_REQUEST_SIZE) {
      options.push({
        key: 'no-more-option',
        className: 'optionslist--endOfOptionsGroupLabel',
        label: OptionsListStrings.popover.getAtEndOfOptionsMessage(),
        isGroupLabel: true,
      });
    }
    setSelectableOptions(existsSelectableOption ? [existsSelectableOption, ...options] : options);
  }, [
    suggestions,
    availableOptions,
    showOnlySelected,
    selectedOptions,
    invalidSelections,
    existsSelectableOption,
    canLoadMoreSuggestions,
    fieldFormatter,
  ]);

  const loadMoreOptions = useCallback(() => {
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    if (!listbox) return;

    const { scrollTop, scrollHeight, clientHeight } = listbox;
    if (scrollTop + clientHeight >= scrollHeight - parseInt(euiThemeVars.euiSizeXXL, 10)) {
      // reached the "bottom" of the list, where euiSizeXXL acts as a "margin of error" so that the user doesn't
      // have to scroll **all the way** to the bottom in order to load more options
      stateManager.requestSize.next(totalCardinality ?? MAX_OPTIONS_LIST_REQUEST_SIZE);
    }
  }, [stateManager.requestSize, totalCardinality]);

  const renderOption = useCallback(
    (option, searchStringValue) => {
      if (!allowExpensiveQueries || searchTechnique === 'exact') return option.label;

      return (
        <EuiHighlight search={option.key === 'exists-option' ? '' : searchStringValue}>
          {option.label}
        </EuiHighlight>
      );
    },
    [searchTechnique, allowExpensiveQueries]
  );

  useEffect(() => {
    const container = listRef.current;
    if (!loading && canLoadMoreSuggestions) {
      container?.addEventListener('scroll', loadMoreOptions, true);
      return () => {
        container?.removeEventListener('scroll', loadMoreOptions, true);
      };
    }
  }, [loadMoreOptions, loading, canLoadMoreSuggestions]);

  useEffect(() => {
    // scroll back to the top when changing the sorting or the search string
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    listbox?.scrollTo({ top: 0 });
  }, [sort, searchString]);

  return (
    <>
      <div ref={listRef}>
        <EuiSelectable
          options={selectableOptions}
          renderOption={(option) => renderOption(option, searchString)}
          listProps={{ onFocusBadge: false }}
          aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
            fieldSpec?.displayName ?? fieldSpec?.name ?? '',
            selectableOptions.length
          )}
          // emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
          onChange={(newSuggestions, _, changedOption) => {
            const key = changedOption.key ?? changedOption.label;
            setSelectableOptions(newSuggestions);
            api.makeSelection(key, showOnlySelected);
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
};
