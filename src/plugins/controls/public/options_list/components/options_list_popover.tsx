/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { isEmpty } from 'lodash';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPopoverTitle } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { pluginServices } from '../../services';

export interface OptionsListPopoverProps {
  width: number;
  isLoading: boolean;
  loadMoreSuggestions: (cardinality: number) => void;
  updateSearchString: (newSearchString: string) => void;
}

export const OptionsListPopover = ({
  width,
  isLoading,
  loadMoreSuggestions,
  updateSearchString,
}: OptionsListPopoverProps) => {
  // Redux embeddable container Context
  const { useEmbeddableSelector: select } = useReduxEmbeddableContext<
    OptionsListReduxState,
    typeof optionsListReducers
  >();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const availableOptions = select((state) => state.componentState.availableOptions);
  const field = select((state) => state.componentState.field);

  const hideActionBar = select((state) => state.explicitInput.hideActionBar);
  const hideFooter = select((state) => state.explicitInput.hideFooter);
  const fieldName = select((state) => state.explicitInput.fieldName);
  const title = select((state) => state.explicitInput.title);
  const id = select((state) => state.explicitInput.id);

  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [allowExpensiveQueries, setAllowExpensiveQueries] = useState(false);

  // Controls Services Context
  const {
    optionsList: { getAllowExpensiveQueries },
  } = pluginServices.getServices();

  useEffect(() => {
    const waitForAllowExpensiveQueries = async () => {
      const allow = await getAllowExpensiveQueries();
      setAllowExpensiveQueries(allow);
    };
    waitForAllowExpensiveQueries();
  }, [getAllowExpensiveQueries]);

  return (
    <>
      <div
        id={`control-popover-${id}`}
        style={{ width, minWidth: 300 }}
        data-test-subj={`optionsList-control-popover`}
        aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
      >
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>{title}</EuiFlexItem>
            {!allowExpensiveQueries && (
              <EuiFlexItem grow={false}>
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

        {field?.type !== 'boolean' && !hideActionBar && (
          <OptionsListPopoverActionBar
            showOnlySelected={showOnlySelected}
            updateSearchString={updateSearchString}
            allowExpensiveQueries={allowExpensiveQueries}
          />
        )}
        <div
          data-test-subj={`optionsList-control-available-options`}
          data-option-count={isLoading ? 0 : Object.keys(availableOptions ?? {}).length}
          style={{ width: '100%', height: '100%' }}
        >
          <OptionsListPopoverSuggestions
            loadMoreSuggestions={loadMoreSuggestions}
            showOnlySelected={showOnlySelected}
          />
          {!showOnlySelected && invalidSelections && !isEmpty(invalidSelections) && (
            <OptionsListPopoverInvalidSelections />
          )}
        </div>
        {!hideFooter && (
          <OptionsListPopoverFooter
            isLoading={isLoading}
            showOnlySelected={showOnlySelected}
            setShowOnlySelected={setShowOnlySelected}
          />
        )}
      </div>
    </>
  );
};
