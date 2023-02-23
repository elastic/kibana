/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { isEmpty } from 'lodash';

import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';
import { OptionsListPopoverTitle } from './options_list_popover_title';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';

export interface OptionsListPopoverProps {
  width: number;
  isLoading: boolean;
  loadMoreSuggestions: (cardinality: number) => void;
  updateSearchString: (newSearchString: string) => void;
}

export const OptionsListPopover = ({
  width,
  isLoading,
  updateSearchString,
  loadMoreSuggestions,
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
  const hideExclude = select((state) => state.explicitInput.hideExclude);
  const fieldName = select((state) => state.explicitInput.fieldName);
  const id = select((state) => state.explicitInput.id);

  const [showOnlySelected, setShowOnlySelected] = useState(false);

  return (
    <>
      <div
        id={`control-popover-${id}`}
        style={{ width, minWidth: 300 }}
        data-test-subj={`optionsList-control-popover`}
        aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
      >
        <OptionsListPopoverTitle />

        {field?.type !== 'boolean' && !hideActionBar && (
          <OptionsListPopoverActionBar
            showOnlySelected={showOnlySelected}
            updateSearchString={updateSearchString}
            setShowOnlySelected={setShowOnlySelected}
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
        {!hideExclude && <OptionsListPopoverFooter isLoading={isLoading} />}
      </div>
    </>
  );
};
