/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { useFieldFormatter } from '../../hooks/use_field_formatter';
import { useOptionsList } from '../embeddable/options_list_embeddable';
import { OptionsListStrings } from './options_list_strings';

export const OptionsListPopoverInvalidSelections = () => {
  const optionsList = useOptionsList();

  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);

  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const fieldSpec = optionsList.select((state) => state.componentState.field);

  const dataViewId = optionsList.select((state) => state.output.dataViewId);
  const fieldFormatter = useFieldFormatter({ dataViewId, fieldSpec });

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to unchecking options */
    const options: EuiSelectableOption[] = (invalidSelections ?? []).map((key) => {
      return {
        key,
        label: fieldFormatter(key),
        checked: 'on',
        className: 'optionsList__selectionInvalid',
        'data-test-subj': `optionsList-control-invalid-selection-${key}`,
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
  }, [fieldFormatter, invalidSelections]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle
        size="xxs"
        className="optionsList-control-ignored-selection-title"
        data-test-subj="optionList__invalidSelectionLabel"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="warning"
              color="warning"
              title={OptionsListStrings.popover.getInvalidSelectionScreenReaderText()}
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <label>
              {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(
                invalidSelections?.length ?? 0
              )}
            </label>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          optionsList.dispatch.deselectOption(changedOption.key ?? changedOption.label);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
};
