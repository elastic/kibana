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
import { isArray } from 'lodash';
import { EuiButtonEmpty, EuiFlexItem, EuiFormRow, EuiSpacer, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EMPTY_STRING, getInitModelList, getRange, parse } from './number_list/utils';
import { NumberRow, NumberRowModel } from './number_list/number_row';
import { AggParamEditorProps } from '../../agg_param_props';

const generateId = htmlIdGenerator();

function SimpleNumberList({
  agg,
  aggParam,
  value,
  setValue,
  setTouched,
}: AggParamEditorProps<Array<number | ''>>) {
  const [numbers, setNumbers] = useState(
    getInitModelList(value && isArray(value) ? value : [EMPTY_STRING])
  );
  const numberRange = useMemo(() => getRange('[-Infinity,Infinity]'), []);

  // This useEffect is needed to discard changes, it sets numbers a mapped value if they are different
  useEffect(() => {
    if (
      isArray(value) &&
      (value.length !== numbers.length ||
        !value.every((numberValue, index) => numberValue === numbers[index].value))
    ) {
      setNumbers(
        value.map((numberValue) => ({
          id: generateId(),
          value: numberValue,
          isInvalid: false,
        }))
      );
    }
  }, [numbers, value]);

  const onUpdate = useCallback(
    (numberList: NumberRowModel[]) => {
      setNumbers(numberList);
      setValue(numberList.map(({ value: numberValue }) => numberValue));
    },
    [setValue]
  );

  const onChangeValue = useCallback(
    (numberField: { id: string; value: string }) => {
      onUpdate(
        numbers.map((number) =>
          number.id === numberField.id
            ? {
                id: numberField.id,
                value: parse(numberField.value),
                isInvalid: false,
              }
            : number
        )
      );
    },
    [numbers, onUpdate]
  );

  // Add an item to the end of the list
  const onAdd = useCallback(() => {
    const newArray = [
      ...numbers,
      {
        id: generateId(),
        value: EMPTY_STRING as '',
        isInvalid: false,
      },
    ];
    onUpdate(newArray);
  }, [numbers, onUpdate]);

  const onDelete = useCallback(
    (id: string) => onUpdate(numbers.filter((number) => number.id !== id)),
    [numbers, onUpdate]
  );

  return (
    <EuiFormRow
      id={`${aggParam.name}-${agg.id}}`}
      label={aggParam.displayName || aggParam.name}
      fullWidth={true}
      compressed
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
  );
}

export { SimpleNumberList };
