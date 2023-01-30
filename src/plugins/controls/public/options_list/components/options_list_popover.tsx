/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { isEmpty } from 'lodash';

import { EuiPopoverTitle } from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { useOptionsList } from '../embeddable/options_list_embeddable';

export interface OptionsListPopoverProps {
  width: number;
  isLoading: boolean;
  updateSearchString: (newSearchString: string) => void;
}

export const OptionsListPopover = ({
  width,
  isLoading,
  updateSearchString,
}: OptionsListPopoverProps) => {
  const optionsList = useOptionsList();

  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const availableOptions = optionsList.select((state) => state.componentState.availableOptions);
  const hideActionBar = optionsList.select((state) => state.explicitInput.hideActionBar);
  const hideExclude = optionsList.select((state) => state.explicitInput.hideExclude);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);
  const field = optionsList.select((state) => state.componentState.field);
  const title = optionsList.select((state) => state.explicitInput.title);
  const id = optionsList.select((state) => state.explicitInput.id);

  const [showOnlySelected, setShowOnlySelected] = useState(false);

  return (
    <div
      id={`control-popover-${id}`}
      style={{ width, minWidth: 300 }}
      data-test-subj={`optionsList-control-popover`}
      aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      {field?.type !== 'boolean' && !hideActionBar && (
        <OptionsListPopoverActionBar
          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
          updateSearchString={updateSearchString}
        />
      )}
      <div
        data-test-subj={`optionsList-control-available-options`}
        data-option-count={isLoading ? 0 : Object.keys(availableOptions ?? {}).length}
      >
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected} isLoading={isLoading} />
        {!showOnlySelected && invalidSelections && !isEmpty(invalidSelections) && (
          <OptionsListPopoverInvalidSelections />
        )}
      </div>
      {!hideExclude && <OptionsListPopoverFooter />}
    </div>
  );
};
