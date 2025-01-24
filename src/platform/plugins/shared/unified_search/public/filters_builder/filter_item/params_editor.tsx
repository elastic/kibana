/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useContext } from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { EuiToolTip, EuiFormRow } from '@elastic/eui';
import { FilterMetaParams } from '@kbn/es-query/src/filters/build_filters';
import type { Operator } from '../../filter_bar/filter_editor';
import { getFieldValidityAndErrorMessage } from '../../filter_bar/filter_editor/lib';
import { FiltersBuilderContextType } from '../context';
import { ParamsEditorInput, ParamsEditorInputProps } from './params_editor_input';

interface ParamsEditorProps {
  dataView: DataView;
  params: unknown;
  onHandleParamsChange: (params: Filter['meta']['params']) => void;
  onHandleParamsUpdate: (value: string) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  field?: DataViewField;
  operator?: Operator;
}

export function ParamsEditor({
  dataView,
  field,
  operator,
  params,
  onHandleParamsChange,
  onHandleParamsUpdate,
  timeRangeForSuggestionsOverride,
  filtersForSuggestions,
}: ParamsEditorProps) {
  const { disabled, suggestionsAbstraction } = useContext(FiltersBuilderContextType);
  const onParamsChange = useCallback<ParamsEditorInputProps['onParamsChange']>(
    (selectedParams) => {
      onHandleParamsChange(selectedParams as FilterMetaParams);
    },
    [onHandleParamsChange]
  );

  const onParamsUpdate = useCallback<ParamsEditorInputProps['onParamsUpdate']>(
    (value: any) => {
      onHandleParamsUpdate(value);
    },
    [onHandleParamsUpdate]
  );

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(
    field!,
    typeof params === 'string' ? params : undefined
  );

  return (
    <EuiFormRow fullWidth isInvalid={isInvalid}>
      <EuiToolTip position="bottom" content={errorMessage ?? null} display="block">
        <ParamsEditorInput
          field={field}
          params={params}
          operator={operator}
          invalid={isInvalid}
          disabled={disabled}
          dataView={dataView}
          onParamsChange={onParamsChange}
          onParamsUpdate={onParamsUpdate}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filtersForSuggestions={filtersForSuggestions}
          suggestionsAbstraction={suggestionsAbstraction}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
