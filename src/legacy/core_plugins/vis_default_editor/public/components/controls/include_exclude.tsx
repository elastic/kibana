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

import React, { Fragment, useCallback, useMemo, useState } from 'react';
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

export function IncludeExcludeParamEditor(
  props: AggParamEditorProps<string | Array<number | undefined>>
) {
  const generateId = htmlIdGenerator();
  const [numbers, setNumbers] = useState(
    getInitModelList(
      props.value && isArray(props.value) ? (props.value as Array<number | undefined>) : [undefined]
    )
  );
  const numberRange = useMemo(() => getRange('[-Infinity,Infinity]'), []);
  const [isValid, setIsValid] = useState(true);

  const setValidity = useCallback(
    (isListValid: boolean) => {
      setIsValid(isListValid);
      props.setValidity(isListValid);
    },
    [props.setValidity]
  );

  useValidation(setValidity, !hasInvalidValues(numbers));

  const onUpdate = useCallback((numberList: NumberRowModel[]) => {
    setNumbers(numberList);
    props.setValue(
      numberList.map(({ value }) => value).filter(value => value !== EMPTY_STRING) as number[]
    );
  }, []);

  const onChangeValue = useCallback(
    ({ id, value }: { id: string; value: string }) => {
      const parsedValue = parse(value);

      onUpdate(
        numbers.map(number =>
          number.id === id
            ? {
                id,
                value: parsedValue,
                isInvalid: value !== EMPTY_STRING && isNaN(parseFloat(value)),
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
    (id: string) => {
      const newArray = numbers.filter(model => model.id !== id);
      onUpdate(newArray);
    },
    [numbers, onUpdate]
  );

  return isNumberType(props.agg) ? (
    <EuiFormRow
      id={`${props.aggParam.name}-${props.agg.id}}`}
      label={props.aggParam.displayName || props.aggParam.name}
      fullWidth={true}
      compressed
      isInvalid={props.showValidation ? !isValid : false}
    >
      <>
        {numbers.map((number, arrayIndex) => (
          <Fragment key={number.id}>
            <NumberRow
              isInvalid={number.isInvalid}
              disableDelete={numbers.length === 1}
              model={number}
              labelledbyId={`${props.aggParam.name}-${props.agg.id}-legend`}
              range={numberRange}
              onDelete={onDelete}
              onChange={onChangeValue}
              onBlur={props.setTouched}
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
    <StringParamEditor {...props} value={props.value as string | undefined} />
  );
}
