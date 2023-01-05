/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { EuiSpacer, EuiIcon, useEuiTheme, EuiText, EuiSelectable, EuiToolTip } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListPopoverSuggestionsProps {
  isLoading: boolean;
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  isLoading,
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { replaceSelection, deselectOption, selectOption, selectExists },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();
  const { euiTheme } = useEuiTheme();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const availableOptions = select((state) => state.componentState.availableOptions);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const hideExists = select((state) => state.explicitInput.hideExists);
  const fieldName = select((state) => state.explicitInput.fieldName);

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );

  const suggestions = useMemo(() => {
    return showOnlySelected ? selectedOptions : Object.keys(availableOptions ?? {});
  }, [availableOptions, selectedOptions, showOnlySelected]);

  const existsSelectableOption = useMemo<EuiSelectableOption>(() => {
    return {
      key: 'exists-option',
      checked: existsSelected ? 'on' : undefined,
      label: OptionsListStrings.controlAndPopover.getExists(),
      className: 'optionsList__existsFilter',
      'data-test-subj': 'optionsList-control-selection-exists',
    };
  }, [existsSelected]);

  const suggestionsSelectableOptions = useMemo<EuiSelectableOption[]>(() => {
    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    const options: EuiSelectableOption[] =
      suggestions?.map((key) => {
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
              <EuiToolTip
                content={OptionsListStrings.popover.getDocumentCountTooltip(
                  availableOptions[key].doc_count
                )}
                position={'right'}
              >
                <EuiText
                  className="eui-textNumber"
                  size="xs"
                  color={euiTheme.colors.subduedText}
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                  `}
                >
                  {`${availableOptions[key].doc_count.toLocaleString()}`}
                </EuiText>
              </EuiToolTip>
            ) : undefined,
          'aria-label': availableOptions?.[key]
            ? OptionsListStrings.popover.getSuggestionAriaLabel(
                key,
                availableOptions[key].doc_count ?? 0
              )
            : key,
        };
      }) ?? [];

    return !hideExists && !(showOnlySelected && !existsSelected)
      ? [existsSelectableOption, ...options]
      : options;
  }, [
    euiTheme,
    hideExists,
    suggestions,
    existsSelected,
    availableOptions,
    showOnlySelected,
    selectedOptionsSet,
    invalidSelectionsSet,
    existsSelectableOption,
  ]);

  const [suggestionsTest, setSuggestionsTest] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes suggestionsSelectableOptions responsive to search, show only selected, and clear selections */
    setSuggestionsTest(suggestionsSelectableOptions);
  }, [suggestionsSelectableOptions]);

  return (
    <>
      <EuiSelectable
        isLoading={isLoading}
        options={suggestionsTest}
        aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(fieldName)}
        listProps={{ onFocusBadge: false }} // isVirtualized: false
        emptyMessage={
          <span
            className="euiFilterSelect__note"
            data-test-subj={`optionsList-control-${
              showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
            }`}
          >
            <span className="euiFilterSelect__noteContent">
              <EuiIcon type="minusInCircle" />
              <EuiSpacer size="xs" />
              {showOnlySelected
                ? OptionsListStrings.popover.getSelectionsEmptyMessage()
                : OptionsListStrings.popover.getEmptyMessage()}
            </span>
          </span>
        }
        onChange={(newSuggestions, _, changedOption) => {
          setSuggestionsTest(newSuggestions);

          const key = changedOption.key ?? changedOption.label;
          if (key === 'exists-option') {
            dispatch(selectExists(!Boolean(existsSelected)));
          } else if (showOnlySelected) {
            dispatch(deselectOption(key));
          } else if (selectedOptionsSet.has(key)) {
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
    </>
  );
};
