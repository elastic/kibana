/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect } from 'react';
import { AggParamEditorProps } from '../agg_param_props';
import { StringParamEditor } from './string';
import { search } from '../../../../data/public';
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
