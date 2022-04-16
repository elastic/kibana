/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
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
} from '@elastic/eui';
import { isEmpty } from 'lodash';

import { DataViewField } from '@kbn/data-views-plugin/public';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { OptionsListEmbeddableInput } from './types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListComponentState } from './options_list_component';

export const OptionsListPopover = ({
  field,
  loading,
  searchString,
  availableOptions,
  totalCardinality,
  invalidSelections,
  updateSearchString,
  width,
}: {
  field?: DataViewField;
  searchString: string;
  totalCardinality?: number;
  width: number;
  loading: OptionsListComponentState['loading'];
  invalidSelections?: string[];
  updateSearchString: (newSearchString: string) => void;
  availableOptions: OptionsListComponentState['availableOptions'];
}) => {
  // Redux embeddable container Context
  const {
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { selectOption, deselectOption, clearSelections, replaceSelection },
  } = useReduxEmbeddableContext<OptionsListEmbeddableInput, typeof optionsListReducers>();

  const dispatch = useEmbeddableDispatch();
  const { selectedOptions, singleSelect, title } = useEmbeddableSelector((state) => state);

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );

  const [showOnlySelected, setShowOnlySelected] = useState(false);

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
            >
              <EuiFlexItem>
                <EuiFieldSearch
                  compressed
                  disabled={showOnlySelected}
                  fullWidth
                  onChange={(event) => updateSearchString(event.target.value)}
                  value={searchString}
                  data-test-subj="optionsList-control-search-input"
                  placeholder={
                    totalCardinality
                      ? OptionsListStrings.popover.getTotalCardinalityPlaceholder(totalCardinality)
                      : undefined
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {invalidSelections && invalidSelections.length > 0 && (
                  <EuiToolTip
                    content={OptionsListStrings.popover.getInvalidSelectionsTooltip(
                      invalidSelections.length
                    )}
                  >
                    <EuiBadge className="optionsList__ignoredBadge" color="warning">
                      {invalidSelections.length}
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
            {availableOptions?.map((availableOption, index) => (
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
              <div className="euiFilterSelect__note">
                <div className="euiFilterSelect__noteContent">
                  <EuiIcon type="minusInCircle" />
                  <EuiSpacer size="xs" />
                  <p>{OptionsListStrings.popover.getEmptyMessage()}</p>
                </div>
              </div>
            )}

            {!isEmpty(invalidSelections) && (
              <>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs" className="optionsList-control-ignored-selection-title">
                  <label>
                    {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(
                      invalidSelections?.length ?? 0
                    )}
                  </label>
                </EuiTitle>
                <>
                  {invalidSelections?.map((ignoredSelection, index) => (
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
              <div className="euiFilterSelect__note">
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
    </>
  );
};
