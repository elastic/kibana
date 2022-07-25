/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { Operator } from '../../../filter_bar/filter_editor/lib/filter_operators';
import { PhraseValueInput } from '../../../filter_bar/filter_editor/phrase_value_input';
import { PhrasesValuesInput } from '../../../filter_bar/filter_editor/phrases_values_input';
import { RangeValueInput } from '../../../filter_bar/filter_editor/range_value_input';

export function ParamsEditor({
  dataView,
  field,
  operator,
  params,
  onHandleParamsChange,
  onHandleParamsUpdate,
  timeRangeForSuggestionsOverride,
}: {
  dataView: DataView;
  field: DataViewField | undefined;
  operator: Operator | undefined;
  params: any;
  onHandleParamsChange: (params: string) => void;
  onHandleParamsUpdate: (value: any) => void;
  timeRangeForSuggestionsOverride: boolean;
}): JSX.Element {
  if (!dataView) {
    return <></>;
  }

  function onParamsChange(seletedParams: any) {
    onHandleParamsChange(seletedParams);
  }

  function onParamsUpdate(value: string) {
    onHandleParamsUpdate(value);
  }

  switch (operator?.type) {
    case 'exists':
      return <></>;
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
}
