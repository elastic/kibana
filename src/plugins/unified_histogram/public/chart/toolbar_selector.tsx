/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, ReactElement, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
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
  buttonLabel: ReactElement | string;
  popoverTitle: ReactElement | string;
  options: SelectableEntry[];
  onChange?: (chosenOption: SelectableEntry | undefined) => void;
}

export const ToolbarSelector: React.FC<ToolbarSelectorProps> = ({
  'data-test-subj': dataTestSubj,
  buttonLabel,
  popoverTitle,
  options,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>();

  const onSelectionChange = useCallback(
    (newOptions: SelectableEntry[]) => {
      const chosenOption = newOptions.find(({ checked }) => checked === 'on');

      onChange?.(
        chosenOption?.value && chosenOption?.value !== EMPTY_OPTION ? chosenOption : undefined
      );
      setIsOpen(false);
    },
    [onChange, setIsOpen]
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
          css={css`
            max-width: ${euiTheme.base * 12}px;
          `}
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj={`${dataTestSubj}Button`}
          label={buttonLabel}
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
        searchable
        singleSelection
        data-test-subj={`${dataTestSubj}Selector`}
        searchProps={{
          'data-test-subj': `${dataTestSubj}SelectorSearch`,
          onChange: (value) => setSearchTerm(value),
        }}
        options={options}
        onChange={onSelectionChange}
        noMatchesMessage={
          <FormattedMessage
            id="unifiedHistogram.toolbarSelectorPopover.noResults"
            defaultMessage="No results found for {term}"
            values={{
              term: <strong>{searchTerm}</strong>,
            }}
          />
        }
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
