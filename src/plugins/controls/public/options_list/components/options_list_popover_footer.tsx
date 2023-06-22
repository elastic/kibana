/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiProgress,
  EuiButtonGroup,
  EuiPopoverFooter,
  useEuiPaddingSize,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { OptionsListStrings } from './options_list_strings';
import { useOptionsList } from '../embeddable/options_list_embeddable';

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

export const OptionsListPopoverFooter = ({ isLoading }: { isLoading: boolean }) => {
  const optionsList = useOptionsList();

  const exclude = optionsList.select((state) => state.explicitInput.exclude);

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
            <EuiProgress
              data-test-subj="optionsList-control-popover-loading"
              size="xs"
              color="accent"
            />
          </div>
        )}
        <div
          css={css`
            padding: ${useEuiPaddingSize('s')};
          `}
        >
          <EuiButtonGroup
            legend={OptionsListStrings.popover.getIncludeExcludeLegend()}
            options={aggregationToggleButtons}
            idSelected={exclude ? 'optionsList__excludeResults' : 'optionsList__includeResults'}
            onChange={(optionId) =>
              optionsList.dispatch.setExclude(optionId === 'optionsList__excludeResults')
            }
            buttonSize="compressed"
            data-test-subj="optionsList__includeExcludeButtonGroup"
          />
        </div>
      </EuiPopoverFooter>
    </>
  );
};
