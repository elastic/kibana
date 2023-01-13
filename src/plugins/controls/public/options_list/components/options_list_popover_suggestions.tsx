/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import {
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiSpacer,
  EuiIcon,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListPopoverSuggestionsProps {
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
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

  const loading = select((state) => state.output.loading);
  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );
  const suggestions = showOnlySelected ? selectedOptions : Object.keys(availableOptions ?? {});

  if (
    !loading &&
    (!suggestions || suggestions.length === 0) &&
    !(showOnlySelected && existsSelected)
  ) {
    return (
      <div
        className="euiFilterSelect__note"
        data-test-subj={`optionsList-control-${
          showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
        }`}
      >
        <div className="euiFilterSelect__noteContent">
          <EuiIcon type="minusInCircle" />
          <EuiSpacer size="xs" />
          <p>
            {showOnlySelected
              ? OptionsListStrings.popover.getSelectionsEmptyMessage()
              : OptionsListStrings.popover.getEmptyMessage()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideExists && !(showOnlySelected && !existsSelected) && (
        <EuiFilterSelectItem
          data-test-subj={`optionsList-control-selection-exists`}
          checked={existsSelected ? 'on' : undefined}
          key={'exists-option'}
          onClick={() => {
            dispatch(selectExists(!Boolean(existsSelected)));
          }}
          className="optionsList__existsFilter"
        >
          {OptionsListStrings.controlAndPopover.getExists()}
        </EuiFilterSelectItem>
      )}
      {suggestions?.map((key: string) => (
        <EuiFilterSelectItem
          data-test-subj={`optionsList-control-selection-${key}`}
          checked={selectedOptionsSet?.has(key) ? 'on' : undefined}
          key={key}
          onClick={() => {
            if (showOnlySelected) {
              dispatch(deselectOption(key));
              return;
            }
            if (singleSelect) {
              dispatch(replaceSelection(key));
              return;
            }
            if (selectedOptionsSet.has(key)) {
              dispatch(deselectOption(key));
              return;
            }
            dispatch(selectOption(key));
          }}
          className={
            showOnlySelected && invalidSelectionsSet.has(key)
              ? 'optionsList__selectionInvalid'
              : 'optionsList__validSuggestion'
          }
          aria-label={
            availableOptions?.[key]
              ? OptionsListStrings.popover.getSuggestionAriaLabel(
                  key,
                  availableOptions[key].doc_count ?? 0
                )
              : key
          }
        >
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false} alignItems="center">
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: 0;
              `}
            >
              <span
                css={css`
                  overflow: hidden;
                  text-overflow: ellipsis;
                `}
              >{`${key}`}</span>
            </EuiFlexItem>
            {!showOnlySelected && (
              <EuiFlexItem grow={false} tabIndex={-1}>
                {availableOptions && availableOptions[key] && (
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
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFilterSelectItem>
      ))}
    </>
  );
};
