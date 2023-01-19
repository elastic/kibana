/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { debounce } from 'lodash';
import { EuiSelectable } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';
import { euiThemeVars } from '@kbn/ui-theme';

interface OptionsListPopoverSuggestionsProps {
  isLoading: boolean;
  showOnlySelected: boolean;
  loadMoreSuggestions: (cardinality: number) => void;
}

export const OptionsListPopoverSuggestions = ({
  isLoading,
  loadMoreSuggestions,
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { replaceSelection, deselectOption, selectOption, selectExists },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const availableOptions = select((state) => state.componentState.availableOptions);
  const totalCardinality = select((state) => state.componentState.totalCardinality) ?? 0;
  const searchString = select((state) => state.componentState.searchString);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const hideExists = select((state) => state.explicitInput.hideExists);
  const fieldName = select((state) => state.explicitInput.fieldName);
  const sort = select((state) => state.explicitInput.sort);

  const listRef = useRef<HTMLDivElement>(null);

  const canLoadMoreSuggestions = useMemo(
    () => Object.keys(availableOptions ?? {}).length < Math.min(totalCardinality, 1000),
    [availableOptions, totalCardinality]
  );

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );
  const suggestions = useMemo(() => {
    return showOnlySelected ? selectedOptions : Object.keys(availableOptions ?? {});
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
    const options: EuiSelectableOption[] = (suggestions ?? []).map((key) => {
      return {
        key,
        label: key,
        checked: selectedOptionsSet?.has(key) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${key}`,
        className:
          showOnlySelected && invalidSelectionsSet.has(key)
            ? 'optionsList__selectionInvalid'
            : 'optionsList__validSuggestion',
        append:
          !showOnlySelected && availableOptions?.[key] ? (
            <OptionsListPopoverSuggestionBadge documentCount={availableOptions[key].doc_count} />
          ) : undefined,
      };
    });

    if (canLoadMoreSuggestions) {
      options.push({
        key: 'loading-option',
        className: 'optionslist--loadingMoreGroupLabel',
        label: 'Loading more options...',
        isGroupLabel: true,
      });
    } else if (options.length === 1000) {
      options.push({
        key: 'no-more-option',
        className: 'optionslist--endOfOptionsGroupLabel',
        label:
          "You've reached the end of the top 1,000 results. Try narrowing down the available options with a search.",
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
  ]);

  const loadMoreOptions = useCallback(() => {
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    if (!listbox) return;

    const { scrollTop, scrollHeight, clientHeight } = listbox;
    if (scrollTop + clientHeight >= scrollHeight - parseInt(euiThemeVars.euiSizeXXL, 10)) {
      // reached the bottom of the list
      console.log('---> reached the bottom, fire event');
      loadMoreSuggestions(totalCardinality);
    }
  }, [loadMoreSuggestions, totalCardinality]);

  useEffect(() => {
    const container = listRef.current;
    if (canLoadMoreSuggestions) {
      console.log('add');

      container?.addEventListener('scroll', loadMoreOptions, true);
      return () => {
        console.log('destroy');
        container?.removeEventListener('scroll', loadMoreOptions, true);
      };
    }
  }, [loadMoreOptions, canLoadMoreSuggestions]);

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
              dispatch(selectExists(!Boolean(existsSelected)));
            } else if (showOnlySelected || selectedOptionsSet.has(key)) {
              dispatch(deselectOption(key));
            } else if (singleSelect) {
              dispatch(replaceSelection(key));
            } else {
              dispatch(selectOption(key));
            }
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
};
