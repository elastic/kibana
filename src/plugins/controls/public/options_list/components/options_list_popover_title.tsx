/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPopoverTitle, EuiIconTip } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

export const OptionsListPopoverTitle = () => {
  // Redux embeddable container Context
  const { useEmbeddableSelector: select } = useReduxEmbeddableContext<
    OptionsListReduxState,
    typeof optionsListReducers
  >();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const allowExpensiveQueries = select((state) => state.componentState.allowExpensiveQueries);
  const title = select((state) => state.explicitInput.title);

  return (
    <EuiPopoverTitle paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        {!allowExpensiveQueries && (
          <EuiFlexItem data-test-subj="optionsList-allow-expensive-queries-warning" grow={false}>
            <EuiIconTip
              aria-label="Warning"
              type="warning"
              color="warning"
              content={OptionsListStrings.popover.getAllowExpensiveQueriesWarning()}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
