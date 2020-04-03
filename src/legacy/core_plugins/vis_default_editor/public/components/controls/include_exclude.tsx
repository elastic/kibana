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

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexItem, EuiFormRow, EuiSpacer, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { isArray } from 'lodash';
import { AggParamEditorProps } from '../agg_param_props';
import { StringParamEditor } from './string';
import { search } from '../../../../../../plugins/data/public/';
import { NumberRow, NumberRowModel } from './components/number_list/number_row';
import {
  EMPTY_STRING,
  getInitModelList,
  getRange,
  hasInvalidValues,
  parse,
} from './components/number_list/utils';
import { useValidation } from './utils';
const { isNumberType } = search.aggs;

const generateId = htmlIdGenerator();

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
  const [numbers, setNumbers] = useState(
    getInitModelList(value && isArray(value) ? (value as Array<number | undefined>) : [undefined])
  );
  const numberRange = useMemo(() => getRange('[-Infinity,Infinity]'), []);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (
      isArray(value) &&
      (value?.length !== numbers.length ||
        !(value as number[]).every((numberValue, index) => numberValue === numbers[index].value))
    ) {
      setNumbers(
        value.map(
          numberValue =>
            ({
              id: generateId(),
              value: numberValue,
              isInvalid: false,
            } as NumberRowModel)
        )
      );
    }
  }, [value]);

  const setNumbersValidity = useCallback(
    (isListValid: boolean) => {
      setIsValid(isListValid);
      setValidity(isListValid);
    },
    [setValidity]
  );

  useValidation(setNumbersValidity, !hasInvalidValues(numbers));

  const onUpdate = useCallback((numberList: NumberRowModel[]) => {
    setNumbers(numberList);
    setValue(numberList.map(({ value: numberValue }) => numberValue) as number[]);
  }, []);

  const onChangeValue = useCallback(
    (numberField: { id: string; value: string; isInvalid: boolean }) => {
      onUpdate(
        numbers.map(number =>
          number.id === numberField.id
            ? {
                id: numberField.id,
                value: parse(numberField.value),
                isInvalid:
                  numberField.value !== EMPTY_STRING && isNaN(parseFloat(numberField.value)),
              }
            : number
        )
      );
    },
    [numberRange, numbers, onUpdate]
  );

  // Add an item to the end of the list
  const onAdd = useCallback(() => {
    const newArray = [
      ...numbers,
      {
        id: generateId(),
        value: '',
        isInvalid: false,
      } as NumberRowModel,
    ];
    onUpdate(newArray);
  }, [numbers, numberRange, onUpdate]);

  const onDelete = useCallback(
    (id: string) => onUpdate(numbers.filter(number => number.id !== id)),
    [numbers, onUpdate]
  );

  return isNumberType(agg) ? (
    <EuiFormRow
      id={`${aggParam.name}-${agg.id}}`}
      label={aggParam.displayName || aggParam.name}
      fullWidth={true}
      compressed
      isInvalid={showValidation ? !isValid : false}
    >
      <>
        {numbers.map((number, arrayIndex) => (
          <Fragment key={number.id}>
            <NumberRow
              isInvalid={number.isInvalid}
              disableDelete={numbers.length === 1}
              model={number}
              labelledbyId={`${aggParam.name}-${agg.id}-legend`}
              range={numberRange}
              onDelete={onDelete}
              onChange={onChangeValue}
              onBlur={setTouched}
              autoFocus={numbers.length !== 1 && arrayIndex === numbers.length - 1}
            />
            {numbers.length - 1 !== arrayIndex && <EuiSpacer size="s" />}
          </Fragment>
        ))}
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAdd} size="xs">
            <FormattedMessage
              id="visDefaultEditor.controls.includeExclude.addUnitButtonLabel"
              defaultMessage="Add value"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  ) : (
    <StringParamEditor
      agg={agg}
      aggParam={aggParam}
      showValidation={showValidation}
      value={value as string | undefined}
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
