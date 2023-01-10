/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { UnifiedHistogramBreakdownContext } from '../types';
import { fieldSupportsBreakdown } from './field_supports_breakdown';

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
  const fieldOptions = dataView.fields
    .filter(fieldSupportsBreakdown)
    .map((field) => ({ label: field.displayName, value: field.name }))
    .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

  const selectedFields = breakdown.field
    ? [{ label: breakdown.field.displayName, value: breakdown.field.name }]
    : [];

  const onFieldChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const field = newOptions.length
        ? dataView.fields.find((currentField) => currentField.name === newOptions[0].value)
        : undefined;

      onBreakdownFieldChange?.(field);
    },
    [dataView.fields, onBreakdownFieldChange]
  );

  const [fieldPopoverDisabled, setFieldPopoverDisabled] = useState(false);
  const disableFieldPopover = useCallback(() => setFieldPopoverDisabled(true), []);
  const enableFieldPopover = useCallback(
    () => setTimeout(() => setFieldPopoverDisabled(false)),
    []
  );

  const { euiTheme } = useEuiTheme();
  const breakdownCss = css`
    width: 100%;
    max-width: ${euiTheme.base * 22}px;
  `;

  return (
    <EuiToolTip
      position="top"
      content={fieldPopoverDisabled ? undefined : breakdown.field?.displayName}
      anchorProps={{ css: breakdownCss }}
    >
      <EuiComboBox
        data-test-subj="unifiedHistogramBreakdownFieldSelector"
        prepend={i18n.translate('unifiedHistogram.breakdownFieldSelectorLabel', {
          defaultMessage: 'Break down by',
        })}
        placeholder={i18n.translate('unifiedHistogram.breakdownFieldSelectorPlaceholder', {
          defaultMessage: 'Select field',
        })}
        aria-label={i18n.translate('unifiedHistogram.breakdownFieldSelectorAriaLabel', {
          defaultMessage: 'Break down by',
        })}
        singleSelection={{ asPlainText: true }}
        options={fieldOptions}
        selectedOptions={selectedFields}
        onChange={onFieldChange}
        compressed
        fullWidth={true}
        onFocus={disableFieldPopover}
        onBlur={enableFieldPopover}
      />
    </EuiToolTip>
  );
};
