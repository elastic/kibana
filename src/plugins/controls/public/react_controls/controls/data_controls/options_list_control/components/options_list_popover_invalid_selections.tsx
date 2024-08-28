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
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';

export const OptionsListPopoverInvalidSelections = () => {
  const { api } = useOptionsListContext();

  const [invalidSelections, fieldFormatter] = useBatchedPublishingSubjects(
    api.invalidSelections$,
    api.fieldFormatter
  );
  const defaultPanelTitle = useStateFromPublishingSubject(api.defaultPanelTitle);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to unchecking options */
    const options: EuiSelectableOption[] = Array.from(invalidSelections).map((key) => {
      return {
        key: String(key),
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
              {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(invalidSelections.size)}
            </label>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSelectable
        aria-label={OptionsListStrings.popover.getInvalidSelectionsSectionAriaLabel(
          defaultPanelTitle ?? '',
          invalidSelections.size
        )}
        options={selectableOptions}
        listProps={{ onFocusBadge: false, isVirtualized: false }}
        onChange={(newSuggestions, _, changedOption) => {
          setSelectableOptions(newSuggestions);
          api.deselectOption(changedOption.key);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
};
