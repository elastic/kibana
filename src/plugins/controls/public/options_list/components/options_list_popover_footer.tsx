/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopoverFooter, EuiButtonGroup, useEuiBackgroundColor } from '@elastic/eui';
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

export const OptionsListPopoverFooter = () => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setExclude },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const exclude = select((state) => state.explicitInput.exclude);

  return (
    <>
      <EuiPopoverFooter
        paddingSize="s"
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
      >
        <EuiButtonGroup
          legend={OptionsListStrings.popover.getIncludeExcludeLegend()}
          options={aggregationToggleButtons}
          idSelected={exclude ? 'optionsList__excludeResults' : 'optionsList__includeResults'}
          onChange={(optionId) => dispatch(setExclude(optionId === 'optionsList__excludeResults'))}
          buttonSize="compressed"
          data-test-subj="optionsList__includeExcludeButtonGroup"
        />
      </EuiPopoverFooter>
    </>
  );
};
