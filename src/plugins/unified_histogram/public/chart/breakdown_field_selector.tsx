/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { UnifiedHistogramBreakdownContext } from '../types';
import { fieldSupportsBreakdown } from './utils/field_supports_breakdown';

const EMPTY_OPTIONS = '__EMPTY_OPTION__';

type SelectableEntry = EuiSelectableOption<{ value: string }>;

export interface BreakdownFieldSelectorProps {
  dataView: DataView;
  breakdown: UnifiedHistogramBreakdownContext;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
}

export const BreakdownFieldSelector = ({
  dataView,
  breakdown,
  onBreakdownFieldChange,
}: BreakdownFieldSelectorProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>();

  const fieldOptions: SelectableEntry[] = useMemo(() => {
    const options: SelectableEntry[] = dataView.fields
      .filter(fieldSupportsBreakdown)
      .map((field) => ({
        key: field.name,
        label: field.displayName,
        value: field.name,
        checked:
          breakdown?.field?.name === field.name
            ? ('on' as EuiSelectableOption['checked'])
            : undefined,
        prepend: (
          <span
            css={css`
              .euiToken {
                vertical-align: middle;
              }
            `}
          >
            <FieldIcon {...getFieldIconProps(field)} />
          </span>
        ),
      }))
      .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    options.unshift({
      key: EMPTY_OPTIONS,
      value: EMPTY_OPTIONS,
      label: i18n.translate('unifiedHistogram.noBreakdownFieldPlaceholder', {
        defaultMessage: 'No breakdown',
      }),
      checked: !breakdown?.field ? ('on' as EuiSelectableOption['checked']) : undefined,
    });

    return options;
  }, [dataView, breakdown.field]);

  const onFieldChange = useCallback(
    (newOptions: SelectableEntry[]) => {
      const chosenOption = newOptions.find(({ checked }) => checked === 'on');

      let field;

      if (chosenOption?.value && chosenOption?.value !== EMPTY_OPTIONS) {
        field = dataView.fields.find((currentField) => currentField.name === chosenOption.value);
      }

      onBreakdownFieldChange?.(field);
      setIsOpen(false);
    },
    [dataView.fields, onBreakdownFieldChange, setIsOpen]
  );

  const panelMinWidth = calculateWidthFromEntries(fieldOptions, ['label']);

  return (
    <EuiPopover
      id="unifiedHistogramBreakdownSelector"
      ownFocus
      initialFocus=".unifiedHistogramBreakdownSelector__popoverPanel"
      panelClassName="unifiedHistogramBreakdownSelector__popoverPanel"
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
          data-test-subj="unifiedHistogramBreakdownSelectorButton"
          label={
            breakdown.field?.displayName ||
            i18n.translate('unifiedHistogram.noBreakdownFieldPlaceholder', {
              defaultMessage: 'No breakdown',
            })
          }
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            {i18n.translate('unifiedHistogram.breakdownFieldPopoverTitle', {
              defaultMessage: 'Select breakdown field',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiSelectable
        searchable
        singleSelection
        data-test-subj="unifiedHistogramBreakdownFieldSelector"
        searchProps={{
          'data-test-subj': 'unifiedHistogramBreakdownSelectorSearch',
          onChange: (value) => setSearchTerm(value),
        }}
        options={fieldOptions}
        onChange={onFieldChange}
        noMatchesMessage={
          <FormattedMessage
            id="unifiedHistogram.breakdownFieldPopover.noResults"
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
