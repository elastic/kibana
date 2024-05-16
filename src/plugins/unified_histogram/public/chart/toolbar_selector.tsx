/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, ReactElement, useState, useMemo } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableProps,
  EuiSelectableOption,
  useEuiTheme,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { i18n } from '@kbn/i18n';

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
  optionMatcher?: EuiSelectableProps['optionMatcher'];
}

export const ToolbarSelector: React.FC<ToolbarSelectorProps> = ({
  'data-test-subj': dataTestSubj,
  'data-selected-value': dataSelectedValue,
  buttonLabel,
  popoverTitle,
  options,
  searchable,
  onChange,
  optionMatcher,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>();
  const [labelPopoverDisabled, setLabelPopoverDisabled] = useState(false);

  const disableLabelPopover = useCallback(() => setLabelPopoverDisabled(true), []);

  const enableLabelPopover = useCallback(
    () => setTimeout(() => setLabelPopoverDisabled(false)),
    []
  );

  const onSelectionChange = useCallback<
    NonNullable<EuiSelectableProps<SelectableEntry>['onChange']>
  >(
    (newOptions) => {
      const chosenOption = newOptions.find(({ checked }) => checked === 'on');

      onChange?.(
        chosenOption?.value && chosenOption?.value !== EMPTY_OPTION ? chosenOption : undefined
      );
      setIsOpen(false);
      disableLabelPopover();
    },
    [disableLabelPopover, onChange]
  );

  const searchProps: EuiSelectableProps['searchProps'] = useMemo(
    () =>
      searchable
        ? {
            id: `${dataTestSubj}SelectableInput`,
            'data-test-subj': `${dataTestSubj}SelectorSearch`,
            compressed: true,
            placeholder: i18n.translate(
              'unifiedHistogram.toolbarSelectorPopover.searchPlaceholder',
              {
                defaultMessage: 'Search',
              }
            ),
            onChange: (value) => setSearchTerm(value),
          }
        : undefined,
    [dataTestSubj, searchable, setSearchTerm]
  );

  const panelMinWidth = calculateWidthFromEntries(options, ['label']) + 2 * euiTheme.base; // plus extra width for the right Enter button

  return (
    <EuiPopover
      id={dataTestSubj}
      ownFocus
      initialFocus={
        searchable ? `#${dataTestSubj}SelectableInput` : `#${dataTestSubj}Selectable_listbox`
      }
      panelProps={{
        css: searchable
          ? css`
              min-width: ${panelMinWidth}px;
            `
          : css`
              width: ${panelMinWidth}px;
            `,
      }}
      panelPaddingSize="none"
      button={
        <EuiToolTip
          content={labelPopoverDisabled ? undefined : buttonLabel}
          delay="long"
          display="block"
        >
          <ToolbarButton
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              width: 100%;
              min-width: 0;
              max-width: ${euiTheme.base * 20}px;
            `}
            data-test-subj={`${dataTestSubj}Button`}
            data-selected-value={dataSelectedValue}
            aria-label={popoverTitle}
            label={buttonLabel}
            onClick={() => setIsOpen(!isOpen)}
            onBlur={enableLabelPopover}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle paddingSize="s">{popoverTitle}</EuiPopoverTitle>
      <EuiSelectable<SelectableEntry>
        id={`${dataTestSubj}Selectable`}
        singleSelection
        aria-label={popoverTitle}
        data-test-subj={`${dataTestSubj}Selectable`}
        options={options}
        onChange={onSelectionChange}
        optionMatcher={optionMatcher}
        listProps={{
          truncationProps: { truncation: 'middle' },
          isVirtualized: searchable,
        }}
        {...(searchable
          ? {
              searchable,
              searchProps,
              noMatchesMessage: (
                <p>
                  <FormattedMessage
                    id="unifiedHistogram.toolbarSelectorPopover.noResults"
                    defaultMessage="No results found for {term}"
                    values={{
                      term: <strong>{searchTerm}</strong>,
                    }}
                  />
                </p>
              ),
            }
          : {})}
      >
        {(list, search) => (
          <>
            {search && (
              <EuiPanel paddingSize="s" hasShadow={false} css={{ paddingBottom: 0 }}>
                {search}
              </EuiPanel>
            )}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
