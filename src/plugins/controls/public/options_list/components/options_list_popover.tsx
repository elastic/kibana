/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import { isEmpty } from 'lodash';

import {
  EuiFilterSelectItem,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  EuiSpacer,
  EuiBadge,
  EuiIcon,
  EuiTitle,
  EuiPopoverFooter,
  EuiButtonGroup,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { optionsListReducers } from '../options_list_reducers';
import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';

export interface OptionsListPopoverProps {
  width: number;
  updateSearchString: (newSearchString: string) => void;
}

const aggregationToggleButtons = [
  {
    id: 'optionsList__includeResults',
    label: OptionsListStrings.popover.getIncludeLabel(),
  },
  {
    id: 'optionsList__excludeResults',
    label: OptionsListStrings.popover.getExcludeLabel(),
  },
];

export const OptionsListPopover = ({ width, updateSearchString }: OptionsListPopoverProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: {
      selectOption,
      deselectOption,
      clearSelections,
      replaceSelection,
      setExclude,
      selectExists,
    },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();

  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const ignoredSelections = select((state) => state.componentState.ignoredSelections);
  const totalCardinality = select((state) => state.componentState.totalCardinality);
  const availableOptions = select((state) => state.componentState.availableOptions);
  const searchString = select((state) => state.componentState.searchString);
  const field = select((state) => state.componentState.field);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const hideExclude = select((state) => state.explicitInput.hideExclude);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const title = select((state) => state.explicitInput.title);
  const exclude = select((state) => state.explicitInput.exclude);

  const loading = select((state) => state.output.loading);

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );

  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const euiBackgroundColor = useEuiBackgroundColor('subdued');

  const combinedIgnoredSelections = useMemo(() => {
    return (invalidSelections ?? []).concat(ignoredSelections ?? []);
  }, [ignoredSelections, invalidSelections]);

  return (
    <>
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      {field?.type !== 'boolean' && (
        <div className="optionsList__actions">
          <EuiFormRow fullWidth>
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem>
                <EuiFieldSearch
                  isInvalid={!searchString.valid}
                  compressed
                  disabled={showOnlySelected}
                  fullWidth
                  onChange={(event) => updateSearchString(event.target.value)}
                  value={searchString.value}
                  data-test-subj="optionsList-control-search-input"
                  placeholder={
                    totalCardinality
                      ? OptionsListStrings.popover.getTotalCardinalityPlaceholder(totalCardinality)
                      : undefined
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {combinedIgnoredSelections.length > 0 && (
                  <EuiToolTip
                    content={OptionsListStrings.popover.getInvalidSelectionsTooltip(
                      combinedIgnoredSelections.length
                    )}
                  >
                    <EuiBadge className="optionsList__ignoredBadge" color="warning">
                      {combinedIgnoredSelections.length}
                    </EuiBadge>
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                >
                  <EuiButtonIcon
                    size="s"
                    color="danger"
                    iconType="eraser"
                    data-test-subj="optionsList-control-clear-all-selections"
                    aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                    onClick={() => dispatch(clearSelections({}))}
                  />
                </EuiToolTip>
              </EuiFlexItem>
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
                    size="s"
                    iconType="list"
                    aria-pressed={showOnlySelected}
                    color={showOnlySelected ? 'primary' : 'text'}
                    display={showOnlySelected ? 'base' : 'empty'}
                    aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                    data-test-subj="optionsList-control-show-only-selected"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </div>
      )}
      <div
        style={{ width: width > 300 ? width : undefined }}
        className="optionsList__items"
        data-option-count={availableOptions?.length ?? 0}
        data-test-subj={`optionsList-control-available-options`}
      >
        {!showOnlySelected && (
          <>
            <EuiFilterSelectItem
              data-test-subj={`optionsList-control-selection-test`}
              checked={existsSelected ? 'on' : undefined}
              key={'exists-option'}
              onClick={() => {
                console.log(existsSelected);
                dispatch(selectExists(!Boolean(existsSelected)));
                console.log(existsSelected);
              }}
            >
              <i>{`Exists (*)`}</i>
            </EuiFilterSelectItem>
            {!existsSelected &&
              availableOptions?.map((availableOption, index) => (
                <EuiFilterSelectItem
                  data-test-subj={`optionsList-control-selection-${availableOption}`}
                  checked={selectedOptionsSet?.has(availableOption) ? 'on' : undefined}
                  key={index}
                  onClick={() => {
                    if (singleSelect) {
                      dispatch(replaceSelection(availableOption));
                      return;
                    }
                    if (selectedOptionsSet.has(availableOption)) {
                      dispatch(deselectOption(availableOption));
                      return;
                    }
                    dispatch(selectOption(availableOption));
                  }}
                >
                  {`${availableOption}`}
                </EuiFilterSelectItem>
              ))}

            {!loading && (!availableOptions || availableOptions.length === 0) && (
              <div
                className="euiFilterSelect__note"
                data-test-subj="optionsList-control-noSelectionsMessage"
              >
                <div className="euiFilterSelect__noteContent">
                  <EuiIcon type="minusInCircle" />
                  <EuiSpacer size="xs" />
                  <p>{OptionsListStrings.popover.getEmptyMessage()}</p>
                </div>
              </div>
            )}

            {!isEmpty(combinedIgnoredSelections) && (
              <>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs" className="optionsList-control-ignored-selection-title">
                  <label>
                    {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(
                      combinedIgnoredSelections?.length ?? 0
                    )}
                  </label>
                </EuiTitle>
                <>
                  {combinedIgnoredSelections?.map((ignoredSelection, index) => (
                    <EuiFilterSelectItem
                      data-test-subj={`optionsList-control-ignored-selection-${ignoredSelection}`}
                      checked={'on'}
                      className="optionsList__selectionInvalid"
                      key={index}
                      onClick={() => dispatch(deselectOption(ignoredSelection))}
                    >
                      {`${ignoredSelection}`}
                    </EuiFilterSelectItem>
                  ))}
                </>
              </>
            )}
          </>
        )}
        {showOnlySelected && (
          <>
            {selectedOptions &&
              selectedOptions.map((availableOption, index) => (
                <EuiFilterSelectItem
                  checked={'on'}
                  key={index}
                  onClick={() => dispatch(deselectOption(availableOption))}
                  className={
                    invalidSelectionsSet.has(availableOption)
                      ? 'optionsList__selectionInvalid'
                      : undefined
                  }
                >
                  {`${availableOption}`}
                </EuiFilterSelectItem>
              ))}
            {(!selectedOptions || selectedOptions.length === 0) && (
              <div
                className="euiFilterSelect__note"
                data-test-subj="optionsList-control-selectionsEmptyMessage"
              >
                <div className="euiFilterSelect__noteContent">
                  <EuiIcon type="minusInCircle" />
                  <EuiSpacer size="xs" />
                  <p>{OptionsListStrings.popover.getSelectionsEmptyMessage()}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {!hideExclude && (
        <EuiPopoverFooter
          paddingSize="s"
          css={css`
            background-color: ${euiBackgroundColor};
          `}
        >
          <EuiButtonGroup
            legend={OptionsListStrings.popover.getIncludeExcludeLegend()}
            options={aggregationToggleButtons}
            idSelected={exclude ? 'optionsList__excludeResults' : 'optionsList__includeResults'}
            onChange={(optionId) =>
              dispatch(setExclude(optionId === 'optionsList__excludeResults'))
            }
            buttonSize="compressed"
            data-test-subj="optionsList__includeExcludeButtonGroup"
          />
        </EuiPopoverFooter>
      )}
    </>
  );
};
