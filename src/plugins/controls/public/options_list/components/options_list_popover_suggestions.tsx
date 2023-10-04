/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { euiThemeVars } from '@kbn/ui-theme';
import { EuiHighlight, EuiSelectable } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { MAX_OPTIONS_LIST_REQUEST_SIZE } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { useOptionsList } from '../embeddable/options_list_embeddable';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';
import { useFieldFormatter } from '../../hooks/use_field_formatter';

interface OptionsListPopoverSuggestionsProps {
  showOnlySelected: boolean;
  loadMoreSuggestions: (cardinality: number) => void;
}

export const OptionsListPopoverSuggestions = ({
  showOnlySelected,
  loadMoreSuggestions,
}: OptionsListPopoverSuggestionsProps) => {
  const optionsList = useOptionsList();

  const searchString = optionsList.select((state) => state.componentState.searchString);
  const availableOptions = optionsList.select((state) => state.componentState.availableOptions);
  const totalCardinality = optionsList.select((state) => state.componentState.totalCardinality);
  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const fieldSpec = optionsList.select((state) => state.componentState.field);

  const sort = optionsList.select((state) => state.explicitInput.sort);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);
  const hideExists = optionsList.select((state) => state.explicitInput.hideExists);
  const singleSelect = optionsList.select((state) => state.explicitInput.singleSelect);
  const existsSelected = optionsList.select((state) => state.explicitInput.existsSelected);
  const selectedOptions = optionsList.select((state) => state.explicitInput.selectedOptions);

  const dataViewId = optionsList.select((state) => state.output.dataViewId);
  const isLoading = optionsList.select((state) => state.output.loading) ?? false;

  const listRef = useRef<HTMLDivElement>(null);

  const fieldFormatter = useFieldFormatter({ dataViewId, fieldSpec });

  const canLoadMoreSuggestions = useMemo(
    () =>
      totalCardinality
        ? (availableOptions ?? []).length <
          Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE)
        : false,
    [availableOptions, totalCardinality]
  );

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );
  const suggestions = useMemo(() => {
    return showOnlySelected ? selectedOptions : availableOptions ?? [];
  }, [availableOptions, selectedOptions, showOnlySelected]);

  const existsSelectableOption = useMemo<EuiSelectableOption | undefined>(() => {
    if (hideExists || (!existsSelected && (showOnlySelected || suggestions?.length === 0))) return;

    return {
      key: 'exists-option',
      checked: existsSelected ? 'on' : undefined,
      label: OptionsListStrings.controlAndPopover.getExists(),
      className: 'optionsList__existsFilter',
      'data-test-subj': 'optionsList-control-selection-exists',
    };
  }, [suggestions, existsSelected, showOnlySelected, hideExists]);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const options: EuiSelectableOption[] = (suggestions ?? []).map((suggestion) => {
      if (typeof suggestion === 'string') {
        // this means that `showOnlySelected` is true, and doc count is not known when this is the case
        suggestion = { value: suggestion };
      }

      return {
        key: suggestion.value,
        label: fieldFormatter(suggestion.value) ?? suggestion.value,
        checked: selectedOptionsSet?.has(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
        className:
          showOnlySelected && invalidSelectionsSet.has(suggestion.value)
            ? 'optionsList__selectionInvalid'
            : 'optionsList__validSuggestion',
        append:
          !showOnlySelected && suggestion?.docCount ? (
            <OptionsListPopoverSuggestionBadge documentCount={suggestion.docCount} />
          ) : undefined,
      };
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
    selectedOptionsSet,
    invalidSelectionsSet,
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
      loadMoreSuggestions(totalCardinality ?? MAX_OPTIONS_LIST_REQUEST_SIZE);
    }
  }, [loadMoreSuggestions, totalCardinality]);

  useEffect(() => {
    const container = listRef.current;
    if (!isLoading && canLoadMoreSuggestions) {
      container?.addEventListener('scroll', loadMoreOptions, true);
      return () => {
        container?.removeEventListener('scroll', loadMoreOptions, true);
      };
    }
  }, [loadMoreOptions, isLoading, canLoadMoreSuggestions]);

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
          renderOption={(option) => {
            return (
              <EuiHighlight search={option.key === 'exists-option' ? '' : searchString.value}>
                {option.label}
              </EuiHighlight>
            );
          }}
          listProps={{ onFocusBadge: false }}
          aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
            fieldName,
            selectableOptions.length
          )}
          emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
          onChange={(newSuggestions, _, changedOption) => {
            const key = changedOption.key ?? changedOption.label;
            setSelectableOptions(newSuggestions);
            // the order of these checks matters, so be careful if rearranging them
            if (key === 'exists-option') {
              optionsList.dispatch.selectExists(!Boolean(existsSelected));
            } else if (showOnlySelected || selectedOptionsSet.has(key)) {
              optionsList.dispatch.deselectOption(key);
            } else if (singleSelect) {
              optionsList.dispatch.replaceSelection(key);
            } else {
              optionsList.dispatch.selectOption(key);
            }
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
};
