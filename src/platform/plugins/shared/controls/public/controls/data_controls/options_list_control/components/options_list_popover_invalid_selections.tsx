/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSelectable,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';

const optionsListPopoverInvalidSelectionsStyles = {
  title: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: euiTheme.size.m,
    }),
};

export const OptionsListPopoverInvalidSelections = () => {
  const { componentApi, customStrings } = useOptionsListContext();
  const styles = useMemoCss(optionsListPopoverInvalidSelectionsStyles);

  const [invalidSelections, fieldFormatter] = useBatchedPublishingSubjects(
    componentApi.invalidSelections$,
    componentApi.fieldFormatter
  );
  const defaultPanelTitle = useStateFromPublishingSubject(
    componentApi.defaultTitle$ ?? new BehaviorSubject(undefined)
  );

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to unchecking options */
    const options: EuiSelectableOption[] = Array.from(invalidSelections).map((key) => {
      return {
        key: String(key),
        label: fieldFormatter(key),
        checked: 'on',
        css: css`
          .euiSelectableListItem__prepend {
            margin-inline-end: 0;
          }
        `,
        className: 'optionsList__selectionInvalid',
        'data-test-subj': `optionsList-control-invalid-selection-${key}`,
        prepend: (
          <EuiScreenReaderOnly>
            <div>
              {customStrings?.invalidSelectionsLabel ||
                OptionsListStrings.popover.getInvalidSelectionScreenReaderText()}
              {'" "'} {/* Adds a pause for the screen reader */}
            </div>
          </EuiScreenReaderOnly>
        ),
      };
    });
    setSelectableOptions(options);
  }, [fieldFormatter, invalidSelections, customStrings]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="xxs" data-test-subj="optionList__invalidSelectionLabel" css={styles.title}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="warning"
              title={
                customStrings?.invalidSelectionsLabel ||
                OptionsListStrings.popover.getInvalidSelectionScreenReaderText()
              }
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <label>
              {customStrings?.invalidSelectionsLabel ||
                OptionsListStrings.popover.getInvalidSelectionsSectionTitle(invalidSelections.size)}
            </label>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSelectable
        aria-label={
          customStrings?.invalidSelectionsLabel ||
          OptionsListStrings.popover.getInvalidSelectionsSectionAriaLabel(
            defaultPanelTitle ?? '',
            invalidSelections.size
          )
        }
        options={selectableOptions}
        listProps={{ onFocusBadge: false }}
        onChange={(newSuggestions, _, changedOption) => {
          setSelectableOptions(newSuggestions);
          componentApi.deselectOption(changedOption.key);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
};
