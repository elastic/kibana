/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox, EuiComboBoxOptionOption, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { UnifiedHistogramBreakdownContext } from '../types';

export interface BreakdownFieldSelectorProps {
  dataView: DataView;
  breakdown?: UnifiedHistogramBreakdownContext;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
}

export const BreakdownFieldSelector = ({
  dataView,
  breakdown,
  onBreakdownFieldChange,
}: BreakdownFieldSelectorProps) => {
  const fieldOptions = dataView.fields
    .filter((field) => field.aggregatable)
    .map((field) => ({ label: field.name }));

  const selectedFields = breakdown?.field ? [{ label: breakdown.field.name }] : [];

  const onFieldChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const field = newOptions.length
        ? dataView.fields.find((currentField) => currentField.name === newOptions[0].label)
        : undefined;

      onBreakdownFieldChange?.(field);
    },
    [dataView.fields, onBreakdownFieldChange]
  );

  const { euiTheme } = useEuiTheme();
  const breakdownCss = css`
    max-width: ${euiTheme.base * 22}px;
  `;

  return (
    <EuiComboBox
      prepend={i18n.translate('unifiedHistogram.breakdownFieldSelectorLabel', {
        defaultMessage: 'Break down by',
      })}
      singleSelection={{ asPlainText: true }}
      options={fieldOptions}
      selectedOptions={selectedFields}
      onChange={onFieldChange}
      compressed
      css={breakdownCss}
    />
  );
};
