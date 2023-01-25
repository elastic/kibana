/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiLoadingSpinner, EuiSelectable, EuiSpacer } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';
import { useOptionsList } from '../embeddable/options_list_embeddable';

interface OptionsListPopoverSuggestionsProps {
  isLoading: boolean;
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  isLoading,
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  const optionsList = useOptionsList();

  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const availableOptions = optionsList.select((state) => state.componentState.availableOptions);

  const selectedOptions = optionsList.select((state) => state.explicitInput.selectedOptions);
  const existsSelected = optionsList.select((state) => state.explicitInput.existsSelected);
  const singleSelect = optionsList.select((state) => state.explicitInput.singleSelect);
  const hideExists = optionsList.select((state) => state.explicitInput.hideExists);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);

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
    const suggestionsSelectableOptions = existsSelectableOption
      ? [existsSelectableOption, ...options]
      : options;
    setSelectableOptions(suggestionsSelectableOptions);
  }, [
    suggestions,
    availableOptions,
    showOnlySelected,
    selectedOptionsSet,
    invalidSelectionsSet,
    existsSelectableOption,
  ]);

  return (
    <EuiSelectable
      isLoading={isLoading}
      loadingMessage={
        <span data-test-subj="optionsList-control-popover-loading">
          <EuiLoadingSpinner size="m" />
          <EuiSpacer size="xs" />
          {OptionsListStrings.popover.getLoadingMessage()}
        </span>
      }
      options={selectableOptions}
      listProps={{ onFocusBadge: false }}
      aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
        fieldName,
        selectableOptions.length
      )}
      emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
      onChange={(newSuggestions, _, changedOption) => {
        setSelectableOptions(newSuggestions);

        const key = changedOption.key ?? changedOption.label;
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
  );
};
