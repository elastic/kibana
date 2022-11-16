/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext } from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { EuiToolTip, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Operator } from '../../filter_bar/filter_editor';
import {
  PhraseValueInput,
  PhrasesValuesInput,
  RangeValueInput,
  isRangeParams,
} from '../../filter_bar/filter_editor';
import { getFieldValidityAndErrorMessage } from '../../filter_bar/filter_editor/lib';
import { FiltersBuilderContextType } from '../filters_builder_context';

interface ParamsEditorProps<TParams = unknown> {
  dataView: DataView;
  params: TParams;
  onHandleParamsChange: (params: TParams) => void;
  onHandleParamsUpdate: (value: TParams) => void;
  timeRangeForSuggestionsOverride?: boolean;
  field?: DataViewField;
  operator?: Operator;
}

const getPlaceholderText = (isFieldSelected: boolean, isOperatorSelected: boolean) => {
  if (!isFieldSelected) {
    return i18n.translate('unifiedSearch.filter.filtersBuilder.selectFieldPlaceholder', {
      defaultMessage: 'Please select a field first ...',
    });
  }

  if (!isOperatorSelected) {
    return i18n.translate('unifiedSearch.filter.filtersBuilder.selectOperatorPlaceholder', {
      defaultMessage: 'Please select operator first ...',
    });
  }

  return '';
};

export function ParamsEditor<TParams = unknown>({
  dataView,
  field,
  operator,
  params,
  onHandleParamsChange,
  onHandleParamsUpdate,
  timeRangeForSuggestionsOverride,
}: ParamsEditorProps<TParams>) {
  const { isDisabled } = useContext(FiltersBuilderContextType);
  const onParamsChange = useCallback(
    (selectedParams) => {
      onHandleParamsChange(selectedParams);
    },
    [onHandleParamsChange]
  );

  const onParamsUpdate = useCallback(
    (value) => {
      onHandleParamsUpdate(value);
    },
    [onHandleParamsUpdate]
  );

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(
    field!,
    typeof params === 'string' ? params : undefined
  );

  let Component: JSX.Element | null = null;

  switch (operator?.type) {
    case 'exists':
      return null;
    case 'phrase':
      Component = (
        <PhraseValueInput
          compressed
          indexPattern={dataView}
          field={field!}
          value={params !== undefined ? `${params}` : undefined}
          onChange={onParamsChange}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
          isInvalid={isInvalid}
          isDisabled={isDisabled}
        />
      );
      break;
    case 'phrases':
      Component = (
        <PhrasesValuesInput
          compressed
          indexPattern={dataView}
          field={field!}
          values={Array.isArray(params) ? params : undefined}
          onChange={onParamsChange}
          onParamsUpdate={onParamsUpdate}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
          isDisabled={isDisabled}
        />
      );
      break;
    case 'range':
      Component = (
        <RangeValueInput
          compressed
          field={field!}
          value={isRangeParams(params) ? params : undefined}
          onChange={onParamsChange}
          fullWidth
          isDisabled={isDisabled}
        />
      );
      break;
    default:
      const placeholderText = getPlaceholderText(Boolean(field), Boolean(operator?.type));
      Component = (
        <EuiFieldText
          compressed={true}
          disabled={true}
          placeholder={placeholderText}
          aria-label={placeholderText}
        />
      );
  }

  return (
    <EuiFormRow fullWidth isInvalid={isInvalid}>
      <EuiToolTip position="bottom" content={errorMessage ?? null} display="block">
        {Component}
      </EuiToolTip>
    </EuiFormRow>
  );
}
