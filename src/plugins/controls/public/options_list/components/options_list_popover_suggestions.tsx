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

interface OptionsListPopoverSuggestionsProps {
  isLoading: boolean;
  showOnlySelected: boolean;
  clickLoadMore: (cardinality: number) => void;
}

export const OptionsListPopoverSuggestions = ({
  isLoading,
  clickLoadMore,
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
  const size = select((state) => state.componentState.size) ?? 0;

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const hideExists = select((state) => state.explicitInput.hideExists);
  const fieldName = select((state) => state.explicitInput.fieldName);

  const listRef = useRef<HTMLDivElement>(null);

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );

  const suggestions = useMemo(() => {
    return showOnlySelected ? selectedOptions : Object.keys(availableOptions ?? {});
  }, [availableOptions, selectedOptions, showOnlySelected]);

  const canLoadMoreSuggestions = useMemo(() => {
    const canLoadMore =
      Object.keys(availableOptions ?? {}).length < Math.min(totalCardinality, 1000);
    return canLoadMore;
  }, [availableOptions, totalCardinality]);

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

    setSelectableOptions(existsSelectableOption ? [existsSelectableOption, ...options] : options);
  }, [
    suggestions,
    availableOptions,
    showOnlySelected,
    selectedOptionsSet,
    invalidSelectionsSet,
    existsSelectableOption,
  ]);

  const loadMoreOptions = useCallback(() => {
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    if (!canLoadMoreSuggestions || !listbox) return;

    const { scrollTop, scrollHeight, clientHeight } = listbox;
    if (scrollTop + clientHeight === scrollHeight) {
      // reached the bottom of the list
      console.log('---> reached the bottom, fire event');
      clickLoadMore(totalCardinality);
    }
  }, [clickLoadMore, totalCardinality, canLoadMoreSuggestions]);

  const debouncedLoadMoreOptions = useMemo(() => {
    return debounce(() => {
      loadMoreOptions();
    }, 1000);
  }, [loadMoreOptions]);

  useEffect(() => {
    const container = listRef.current;
    container?.addEventListener('scroll', debouncedLoadMoreOptions, true);
    return () => container?.removeEventListener('scroll', debouncedLoadMoreOptions, true);
  }, [debouncedLoadMoreOptions]);

  useEffect(() => {
    // scroll back to the top when the size is reset back to 10, because this means either sort or search changed
    if (size === 10) {
      console.log('scroll back to top');
      const listbox = listRef.current?.querySelector('.euiSelectableList__list');
      listbox?.scrollTo({ top: 0 });
    }
  }, [size]);

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
