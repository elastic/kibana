/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiSelectableOption,
  EuiSelectable,
  EuiSpacer,
  EuiTitle,
  EuiScreenReaderOnly,
} from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';
import { useOptionsList } from '../embeddable/options_list_embeddable';

export const OptionsListPopoverInvalidSelections = () => {
  const optionsList = useOptionsList();

  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to unchecking options */
    const options: EuiSelectableOption[] = (invalidSelections ?? []).map((key) => {
      return {
        key,
        label: key,
        checked: 'on',
        className: 'optionsList__selectionInvalid',
        'data-test-subj': `optionsList-control-ignored-selection-${key}`,
        prepend: (
          <EuiScreenReaderOnly>
            <div>
              {OptionsListStrings.popover.getInvalidSelectionScreenReaderText()}
              {'" "'} {/* Adds a pause for the screen reader */}
            </div>
          </EuiScreenReaderOnly>
        ),
      };
    });
    setSelectableOptions(options);
  }, [invalidSelections]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle
        size="xxs"
        className="optionsList-control-ignored-selection-title"
        data-test-subj="optionList__ignoredSelectionLabel"
      >
        <label>
          {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(
            invalidSelections?.length ?? 0
          )}
        </label>
      </EuiTitle>
      <EuiSelectable
        aria-label={OptionsListStrings.popover.getInvalidSelectionsSectionAriaLabel(
          fieldName,
          invalidSelections?.length ?? 0
        )}
        options={selectableOptions}
        listProps={{ onFocusBadge: false, isVirtualized: false }}
        onChange={(newSuggestions, _, changedOption) => {
          setSelectableOptions(newSuggestions);
          optionsList.dispatch.deselectOption(changedOption.label);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
};
