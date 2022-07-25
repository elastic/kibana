/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { Operator } from '../../../filter_bar/filter_editor/lib/filter_operators';
import { PhraseValueInput } from '../../../filter_bar/filter_editor/phrase_value_input';
import { PhrasesValuesInput } from '../../../filter_bar/filter_editor/phrases_values_input';
import { RangeValueInput } from '../../../filter_bar/filter_editor/range_value_input';

interface ParamsEditorProps {
  dataView: DataView;
  field: DataViewField | undefined;
  operator: Operator | undefined;
  params: Filter['meta']['params'];
  onHandleParamsChange: (params: string) => void;
  onHandleParamsUpdate: (value: Filter['meta']['params']) => void;
  timeRangeForSuggestionsOverride: boolean;
}

export const ParamsEditor = ({
  dataView,
  field,
  operator,
  params,
  onHandleParamsChange,
  onHandleParamsUpdate,
  timeRangeForSuggestionsOverride,
}: ParamsEditorProps) => {
  // debugger
  const onParamsChange = useCallback(
    (selectedParams: Filter['meta']['params']) => {
      onHandleParamsChange(selectedParams);
    },
    [onHandleParamsChange]
  );

  const onParamsUpdate = useCallback(
    (value: string) => {
      onHandleParamsUpdate(value);
    },
    [onHandleParamsUpdate]
  );

  switch (operator?.type) {
    case 'exists':
      return null;
    case 'phrase':
      return (
        <PhraseValueInput
          compressed
          indexPattern={dataView}
          field={field!}
          value={params}
          onChange={onParamsChange}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
        />
      );
    case 'phrases':
      return (
        <PhrasesValuesInput
          compressed
          indexPattern={dataView}
          field={field!}
          values={params}
          onChange={onParamsChange}
          onParamsUpdate={onParamsUpdate}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
        />
      );
    case 'range':
      return (
        <RangeValueInput
          compressed
          field={field!}
          value={params}
          onChange={onParamsChange}
          fullWidth
        />
      );
    default:
      return (
        <PhraseValueInput
          disabled={!dataView || !operator}
          indexPattern={dataView}
          field={field!}
          value={params}
          onChange={onParamsChange}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          fullWidth
          compressed
        />
      );
  }
};
