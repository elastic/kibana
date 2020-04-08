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
import { isArray } from 'lodash';
import { AggParamEditorProps } from '../agg_param_props';
import { StringParamEditor } from './string';
import { search } from '../../../../data/public';
import { SimpleNumberList } from './components/simple_number_list';
const { isNumberType } = search.aggs;

export function IncludeExcludeParamEditor({
  agg,
  aggParam,
  value,
  setValue,
  setValidity,
  showValidation,
  setTouched,
  editorConfig,
  formIsTouched,
  metricAggs,
  schemas,
  state,
}: AggParamEditorProps<string | Array<number | undefined>>) {
  const isAggOfNumberType = isNumberType(agg);

  // This useEffect converts value from string type to number and back when the field type is changed
  useEffect(() => {
    if (isAggOfNumberType && !isArray(value) && value !== undefined) {
      setValue(
        value
          .split(',')
          .map(item => parseFloat(item))
          .filter(number => !isNaN(number)) as number[]
      );
    } else if (!isAggOfNumberType && isArray(value) && value !== undefined) {
      setValue((value as Array<number | ''>).filter(item => item !== '').toString());
    }
  }, [isAggOfNumberType, setValue, value]);

  return isAggOfNumberType ? (
    <SimpleNumberList
      agg={agg}
      aggParam={aggParam}
      showValidation={showValidation}
      value={value as Array<number | undefined>}
      setValidity={setValidity}
      setValue={setValue}
      setTouched={setTouched}
      editorConfig={editorConfig}
      formIsTouched={formIsTouched}
      metricAggs={metricAggs}
      schemas={schemas}
      state={state}
    />
  ) : (
    <StringParamEditor
      agg={agg}
      aggParam={aggParam}
      showValidation={showValidation}
      value={value as string}
      setValidity={setValidity}
      setValue={setValue}
      setTouched={setTouched}
      editorConfig={editorConfig}
      formIsTouched={formIsTouched}
      metricAggs={metricAggs}
      schemas={schemas}
      state={state}
    />
  );
}
