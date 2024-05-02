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
import { Filter } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  PhraseValueInput,
  PhrasesValuesInput,
  RangeValueInput,
  isRangeParams,
} from '../../filter_bar/filter_editor';
import type { Operator } from '../../filter_bar/filter_editor';
import { SuggestionsAbstraction } from '../../typeahead/suggestions_component';
import { OPERATORS } from '../../filter_bar/filter_editor/lib/filter_operators';
import { formatDateChange } from '../../filter_bar/filter_editor/range_value_input';

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

export interface ParamsEditorInputProps {
  dataView: DataView;
  params: unknown;
  onParamsChange: (params: unknown) => void;
  onParamsUpdate: (value: unknown) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  field?: DataViewField;
  operator?: Operator;
  invalid: boolean;
  disabled: boolean;
  suggestionsAbstraction?: SuggestionsAbstraction;
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
  filtersForSuggestions,
  suggestionsAbstraction,
}: ParamsEditorInputProps) {
  const kibana = useKibana();
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
          filtersForSuggestions={filtersForSuggestions}
          fullWidth
          invalid={invalid}
          disabled={disabled}
          suggestionsAbstraction={suggestionsAbstraction}
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
          filtersForSuggestions={filtersForSuggestions}
          fullWidth
          disabled={disabled}
          suggestionsAbstraction={suggestionsAbstraction}
        />
      );
    case 'range':
      switch (operator.id) {
        case OPERATORS.GREATER_OR_EQUAL:
          return (
            <PhraseValueInput
              compressed
              indexPattern={dataView}
              onBlur={(value) => {
                onParamsChange({ from: formatDateChange(value, kibana) });
              }}
              field={field!}
              value={isRangeParams(params) && params.from ? `${params.from}` : undefined}
              onChange={(value) => onParamsChange({ from: value })}
              fullWidth
              invalid={invalid}
              disabled={disabled}
            />
          );
        case OPERATORS.LESS:
          return (
            <PhraseValueInput
              onBlur={(value) => {
                onParamsChange({ to: formatDateChange(value, kibana) });
              }}
              compressed
              indexPattern={dataView}
              field={field!}
              value={isRangeParams(params) && params.to ? `${params.to}` : undefined}
              onChange={(value) => onParamsChange({ to: value })}
              fullWidth
              invalid={invalid}
              disabled={disabled}
            />
          );
        default:
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
      }
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
