/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopoverFooter,
  EuiProgress,
  useEuiBackgroundColor,
  useEuiPaddingSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';

const aggregationToggleButtons = [
  {
    id: 'optionsList__includeResults',
    key: 'optionsList__includeResults',
    label: OptionsListStrings.popover.getIncludeLabel(),
  },
  {
    id: 'optionsList__excludeResults',
    key: 'optionsList__excludeResults',
    label: OptionsListStrings.popover.getExcludeLabel(),
  },
];

export const OptionsListPopoverFooter = () => {
  const { api, stateManager } = useOptionsListContext();

  const [exclude, loading, allowExpensiveQueries] = useBatchedPublishingSubjects(
    stateManager.exclude,
    api.dataLoading,
    api.parentApi.allowExpensiveQueries$
  );

  return (
    <>
      <EuiPopoverFooter
        paddingSize="none"
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
      >
        {loading && (
          <div style={{ position: 'absolute', width: '100%' }}>
            <EuiProgress
              data-test-subj="optionsList-control-popover-loading"
              size="xs"
              color="accent"
            />
          </div>
        )}

        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          alignItems="center"
          css={css`
            padding: ${useEuiPaddingSize('s')};
          `}
          justifyContent={'spaceBetween'}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={OptionsListStrings.popover.getIncludeExcludeLegend()}
              options={aggregationToggleButtons}
              idSelected={exclude ? 'optionsList__excludeResults' : 'optionsList__includeResults'}
              onChange={(optionId) => api.setExclude(optionId === 'optionsList__excludeResults')}
              buttonSize="compressed"
              data-test-subj="optionsList__includeExcludeButtonGroup"
            />
          </EuiFlexItem>
          {!allowExpensiveQueries && (
            <EuiFlexItem data-test-subj="optionsList-allow-expensive-queries-warning" grow={false}>
              <EuiIconTip
                type="warning"
                color="warning"
                content={OptionsListStrings.popover.getAllowExpensiveQueriesWarning()}
                aria-label={OptionsListStrings.popover.getAllowExpensiveQueriesWarning()}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};
