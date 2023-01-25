/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPopoverTitle, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { optionsListReducers } from '../options_list_reducers';

export const OptionsListPopoverTitle = ({
  allowExpensiveQueries,
}: {
  allowExpensiveQueries: boolean;
}) => {
  // Redux embeddable container Context
  const { useEmbeddableSelector: select } = useReduxEmbeddableContext<
    OptionsListReduxState,
    typeof optionsListReducers
  >();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const title = select((state) => state.explicitInput.title);

  return (
    <EuiPopoverTitle paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        {!allowExpensiveQueries && (
          <EuiFlexItem data-test-subj="optionsList-allow-expensive-queries-warning" grow={false}>
            <EuiIconTip
              aria-label="Warning"
              type="alert"
              color="warning"
              content={
                <FormattedMessage
                  id="controls.optionsList.popover.allowExpensiveQueriesWarning"
                  defaultMessage="{allowExpensiveQueriesSetting} is off, so some features have been disabled."
                  values={{
                    allowExpensiveQueriesSetting: <code>search.allow_expensive_queries</code>,
                  }}
                />
              }
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
