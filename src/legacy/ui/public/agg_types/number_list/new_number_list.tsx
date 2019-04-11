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

import React, { Fragment, useState } from 'react';
import { isUndefined, last } from 'lodash';

import { htmlIdGenerator, EuiText, EuiSpacer, EuiButton, EuiFlexItem, } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseRange, Range } from '../../utils/range';
import { NumberRow, NumberRowModel } from './number_row';
import { isNumber } from 'util';

interface NumberListProps {
  initArray?: (number | '')[];
  unitName: string;
  validateAscendingOrder?: boolean;
  labelledbyId: string;
  range?: string
  onChange(list: any[]): void;
  setValidity(isValid: boolean): void;
}

const defaultRange = parseRange('[0,Infinity)');
const generateId = htmlIdGenerator();

function NumberList({
  initArray = [],
  labelledbyId,
  range,
  unitName,
  validateAscendingOrder,
  onChange,
  setValidity,
}: NumberListProps) {
  const numberRange = getRange(range);
  const validateAscOrder = isUndefined(validateAscendingOrder) ? true : validateAscendingOrder;
  const [numberList, setNumberList] = useState(initArray.map(num => ({ value: num, id: generateId() })))

  const onChangeValue = ({ id, value }: { id: string, value: string}) => {
    const parsedValue = parse(value, numberRange);
    const isInputValid = isValid(parsedValue, numberRange);
    setValidity(isInputValid)

    const currentModel = numberList.find(model => model.id === id);
    currentModel && (currentModel.value = parsedValue);

    setNumberList([...numberList]);
    isInputValid && onChange(numberList.map(model => model.value));
  };

  const onAdd = () => {
    const newArray = [
      ...numberList,
      {
        id: generateId(),
        value: getNext(numberList, numberRange),
      }
    ];
    setNumberList(newArray);
    onChange(newArray.map(model => model.value));
  };

  const onDelete = (id: string) => {
    const newArray = numberList.filter(model => model.id !== id)
    setNumberList(newArray);
    onChange(newArray.map(model => model.value))
  };

  return (
    <>
      {numberList.length
      ?
        numberList.map(model =>
          <Fragment key={model.id}>
            <NumberRow
              disableDelete={numberList.length === 1}
              model={model}
              labelledbyId={labelledbyId}
              range={numberRange}
              onDelete={onDelete}
              onChange={onChangeValue}
            />
            <EuiSpacer size="s" />
          </Fragment>
        )
      : (
        <EuiText textAlign="center" size="s" >
          <FormattedMessage
            id="common.ui.numberList.noUnitSelectedDescription"
            defaultMessage="Please specify at least one {unitName}"
            values={{ unitName }}
          />
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton
          iconType="plusInCircle"
          fill={true}
          fullWidth={true}
          onClick={onAdd}
          size="s"
        >
          <FormattedMessage
            id="common.ui.numberList.addUnitButtonLabel"
            defaultMessage="Add {unitName}"
            values={{ unitName }}
          />
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}

function parse(value: string, range: Range) {
  const parsedValue = parseFloat(value);

  if (isNaN(parsedValue)) {
    return '';
  }

  if (!range.within(parsedValue)) {
      //return INVALID
      return parsedValue;
  };

  // if (validateAscOrder && index > 0) {
  //   const i = index - 1;
  //   const prev = list[i];
  //   if (parsedValue <= prev) {
  //     //return INVALID
  //     return parsedValue;
  //   };
  // }

    return parsedValue;
}

function isValid(value: number | '', range: Range) {
  if (value === '' || !range.within(value)) {
    return false;
  };
  return true;
}

function getRange(range?: string) {
  try {
    return range ? parseRange(range) : defaultRange;
  } catch (e) {
    throw new TypeError('Unable to parse range: ' + e.message);
  }
}

function getNext(list: NumberRowModel[], range: Range): number | '' {
  if (list.length === 0) return '';

  const lastValue = last(list).value
  const next = isNumber(lastValue) ? lastValue + 1 : 1;

  if (next < range.max) {
    return next;
  }

  
  return range.max - 1;
}

export { NumberList };
