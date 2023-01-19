/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiPopoverFooter,
  EuiButtonGroup,
  useEuiBackgroundColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiBadge,
  EuiToolTip,
  EuiProgress,
  useEuiPaddingSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

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

export const OptionsListPopoverFooter = ({
  isLoading,
  showOnlySelected,
  setShowOnlySelected,
}: {
  isLoading: boolean;
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
}) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setExclude, clearSelections },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  const exclude = select((state) => state.explicitInput.exclude);

  return (
    <>
      <EuiPopoverFooter
        paddingSize="none"
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
      >
        {isLoading && (
          <div style={{ position: 'absolute', width: '100%' }}>
            <EuiProgress size="xs" color="accent" />
          </div>
        )}
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={css`
            padding: ${useEuiPaddingSize('s')};
          `}
        >
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" responsive={false}>
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
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    data-test-subj="optionsList-control-show-only-selected"
                    aria-label={
                      showOnlySelected
                        ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                        : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                    }
                  />
                </EuiToolTip>
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
                    onClick={() => dispatch(clearSelections({}))}
                    data-test-subj="optionsList-control-clear-all-selections"
                    aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};
