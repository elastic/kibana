/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { EuiFieldText } from '@elastic/eui';
import {
  PhraseValueInput,
  PhrasesValuesInput,
  RangeValueInput,
  isRangeParams,
} from '../../filter_bar/filter_editor';
import type { Operator } from '../../filter_bar/filter_editor';

export const strings = {
  getSelectFieldPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.selectFieldPlaceholder', {
      defaultMessage: 'Please select a field first...',
    }),
  getSelectOperatorPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.selectOperatorPlaceholder', {
      defaultMessage: 'Please select operator first...',
    }),
};

interface ParamsEditorInputProps {
  dataView: DataView;
  params: unknown;
  onParamsChange: (params: unknown) => void;
  onParamsUpdate: (value: unknown) => void;
  timeRangeForSuggestionsOverride?: boolean;
  field?: DataViewField;
  operator?: Operator;
  invalid: boolean;
  disabled: boolean;
}

const getPlaceholderText = (isFieldSelected: boolean, isOperatorSelected: boolean) => {
  if (!isFieldSelected) {
    return strings.getSelectFieldPlaceholderLabel();
  }

  if (!isOperatorSelected) {
    return strings.getSelectOperatorPlaceholderLabel();
  }

  return '';
};

export function ParamsEditorInput({
  dataView,
  field,
  operator,
  params,
  invalid,
  disabled,
  onParamsChange,
  onParamsUpdate,
  timeRangeForSuggestionsOverride,
}: ParamsEditorInputProps) {
  switch (operator?.type) {
    case 'exists':
      return null;
    case 'phrase':
      return (
        <PhraseValueInput
          compressed
          indexPattern={dataView}
          field={field!}
          value={params !== undefined ? `${params}` : undefined}
          onChange={onParamsChange}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
          invalid={invalid}
          disabled={disabled}
        />
      );
    case 'phrases':
      return (
        <PhrasesValuesInput
          compressed
          indexPattern={dataView}
          field={field!}
          values={Array.isArray(params) ? params : undefined}
          onChange={onParamsChange}
          onParamsUpdate={onParamsUpdate}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
          disabled={disabled}
        />
      );
    case 'range':
      return (
        <RangeValueInput
          compressed
          field={field!}
          value={isRangeParams(params) ? params : undefined}
          onChange={onParamsChange}
          fullWidth
          disabled={disabled}
        />
      );
      break;
    default:
      const placeholderText = getPlaceholderText(Boolean(field), Boolean(operator?.type));
      return (
        <EuiFieldText
          compressed={true}
          disabled={true}
          placeholder={placeholderText}
          aria-label={placeholderText}
        />
      );
  }
}
