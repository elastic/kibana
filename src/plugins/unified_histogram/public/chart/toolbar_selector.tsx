/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, ReactElement, useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableProps,
  EuiSelectableOption,
  useEuiTheme,
} from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';

export const EMPTY_OPTION = '__EMPTY_SELECTOR_OPTION__';

export type SelectableEntry = EuiSelectableOption<{ value: string }>;

export interface ToolbarSelectorProps {
  'data-test-subj': string;
  'data-selected-value'?: string; // currently selected value
  buttonLabel: ReactElement | string;
  popoverTitle: string;
  options: SelectableEntry[];
  searchable: boolean;
  onChange?: (chosenOption: SelectableEntry | undefined) => void;
}

export const ToolbarSelector: React.FC<ToolbarSelectorProps> = ({
  'data-test-subj': dataTestSubj,
  'data-selected-value': dataSelectedValue,
  buttonLabel,
  popoverTitle,
  options,
  searchable,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>();

  const onSelectionChange = useCallback(
    (newOptions) => {
      const chosenOption = newOptions.find(({ checked }: SelectableEntry) => checked === 'on');

      onChange?.(
        chosenOption?.value && chosenOption?.value !== EMPTY_OPTION ? chosenOption : undefined
      );
      setIsOpen(false);
    },
    [onChange, setIsOpen]
  );

  const searchProps: EuiSelectableProps['searchProps'] = useMemo(
    () =>
      searchable
        ? {
            'data-test-subj': `${dataTestSubj}SelectorSearch`,
            onChange: (value) => setSearchTerm(value),
          }
        : undefined,
    [dataTestSubj, searchable, setSearchTerm]
  );

  const panelMinWidth = calculateWidthFromEntries(options, ['label']);

  return (
    <EuiPopover
      id={dataTestSubj}
      ownFocus
      initialFocus={`.${dataTestSubj}__popoverPanel`}
      panelClassName={`${dataTestSubj}__popoverPanel`}
      panelProps={{
        css: css`
          min-width: ${panelMinWidth}px;
        `,
      }}
      panelPaddingSize="s"
      button={
        <ToolbarButton
          size="s"
          css={css`
            max-width: ${euiTheme.base * 12}px;
          `}
          data-test-subj={`${dataTestSubj}Button`}
          data-selected-value={dataSelectedValue}
          aria-label={popoverTitle}
          label={buttonLabel}
          onClick={() => setIsOpen(!isOpen)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>{popoverTitle}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiSelectable
        singleSelection
        aria-label={popoverTitle}
        data-test-subj={`${dataTestSubj}Selectable`}
        options={options}
        onChange={onSelectionChange}
        {...(searchable
          ? {
              searchable,
              searchProps,
              noMatchesMessage: (
                <FormattedMessage
                  id="unifiedHistogram.toolbarSelectorPopover.noResults"
                  defaultMessage="No results found for {term}"
                  values={{
                    term: <strong>{searchTerm}</strong>,
                  }}
                />
              ),
            }
          : {})}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
