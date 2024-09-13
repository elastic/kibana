/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import React, { useState } from 'react';

import { useOptionsList } from '../embeddable/options_list_embeddable';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';

export interface OptionsListPopoverProps {
  isLoading: boolean;
  loadMoreSuggestions: (cardinality: number) => void;
  updateSearchString: (newSearchString: string) => void;
}

export const OptionsListPopover = ({
  isLoading,
  updateSearchString,
  loadMoreSuggestions,
}: OptionsListPopoverProps) => {
  const optionsList = useOptionsList();

  const field = optionsList.select((state) => state.componentState.field);
  const availableOptions = optionsList.select((state) => state.componentState.availableOptions);
  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);

  const id = optionsList.select((state) => state.explicitInput.id);
  const hideExclude = optionsList.select((state) => state.explicitInput.hideExclude);
  const hideActionBar = optionsList.select((state) => state.explicitInput.hideActionBar);

  const [showOnlySelected, setShowOnlySelected] = useState(false);

  return (
    <div
      id={`control-popover-${id}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsList-control-popover`}
    >
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
  );
};
