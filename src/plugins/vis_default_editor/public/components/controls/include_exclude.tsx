/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { search } from '@kbn/data-plugin/public';
import { AggParamEditorProps } from '../agg_param_props';
import { StringParamEditor } from './string';
import { SimpleNumberList } from './components/simple_number_list';
const { isNumberType } = search.aggs;

export function IncludeExcludeParamEditor(props: AggParamEditorProps<string | Array<number | ''>>) {
  const { agg, value, setValue } = props;
  const isAggOfNumberType = isNumberType(agg);

  // This useEffect converts value from string type to number and back when the field type is changed
  useEffect(() => {
    if (isAggOfNumberType && !Array.isArray(value) && value !== undefined) {
      const numberArray = value
        .split('|')
        .map((item) => parseFloat(item))
        .filter((number) => Number.isFinite(number));
      setValue(numberArray.length ? numberArray : ['']);
    } else if (!isAggOfNumberType && Array.isArray(value) && value !== undefined) {
      setValue(value.filter((item) => item !== '').join('|'));
    }
  }, [isAggOfNumberType, setValue, value]);

  return isAggOfNumberType ? (
    <SimpleNumberList {...props} value={value as Array<number | ''>} />
  ) : (
    <StringParamEditor {...props} value={value as string} />
  );
}
