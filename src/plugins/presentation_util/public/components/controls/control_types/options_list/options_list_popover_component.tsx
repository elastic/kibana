/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFilterSelectItem,
  EuiLoadingChart,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiFormRow,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';
import { useReduxEmbeddableContext } from '../../../redux_embeddables/redux_embeddable_context';
import { OptionsListEmbeddableInput } from './options_list_embeddable';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListComponentState } from './options_list_component';

export const OptionsListPopover = ({
  loading,
  searchString,
  availableOptions,
  updateSearchString,
}: {
  searchString: string;
  loading: OptionsListComponentState['loading'];
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
  const { selectedOptions, singleSelect } = useEmbeddableSelector((state) => state);

  // track selectedOptions in a set for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // remove all other selections if this control is single select
  useEffect(() => {
    if (singleSelect && selectedOptions && selectedOptions?.length > 1) {
      dispatch(replaceSelection(selectedOptions[0]));
    }
  }, [selectedOptions, singleSelect, dispatch, replaceSelection]);

  return (
    <>
      <EuiPopoverTitle paddingSize="s">
        <EuiFormRow>
          <EuiFlexGroup gutterSize="xs" direction="row" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFieldSearch
                compressed
                disabled={showOnlySelected}
                onChange={(event) => updateSearchString(event.target.value)}
                value={searchString}
              />
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
                  color={showOnlySelected ? 'primary' : 'subdued'}
                  aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                  onClick={() => setShowOnlySelected(!showOnlySelected)}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiPopoverTitle>

      <div className="optionsList--items">
        {!showOnlySelected && (
          <>
            {availableOptions?.map((availableOption, index) => (
              <EuiFilterSelectItem
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
                {availableOption}
              </EuiFilterSelectItem>
            ))}
            {loading && (
              <div className="optionsList--loadingOverlay">
                <div className="euiFilterSelect__note">
                  <div className="euiFilterSelect__noteContent">
                    <EuiLoadingChart size="m" />
                    <EuiSpacer size="xs" />
                    <p>{OptionsListStrings.popover.getLoadingMessage()}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && (!availableOptions || availableOptions.length === 0) && (
              <div className="euiFilterSelect__note">
                <div className="euiFilterSelect__noteContent">
                  <EuiIcon type="minusInCircle" />
                  <EuiSpacer size="xs" />
                  <p>{OptionsListStrings.popover.getEmptyMessage()}</p>
                </div>
              </div>
            )}
          </>
        )}
        {showOnlySelected && (
          <>
            {selectedOptions &&
              selectedOptions.map((availableOption, index) => (
                <EuiFilterSelectItem
                  checked="on"
                  key={index}
                  onClick={() => dispatch(deselectOption(availableOption))}
                >
                  {availableOption}
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
