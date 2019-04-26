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

import React, { Fragment, useState, useEffect } from 'react';
import { last } from 'lodash';

import { htmlIdGenerator, EuiText, EuiSpacer, EuiButton, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseRange, Range } from '../../utils/range';
import { NumberRow, NumberRowModel } from './number_row';

const EMPTY_STRING = '';
interface NumberListProps {
  numberArray: Array<number | undefined>;
  unitName: string;
  validateAscendingOrder?: boolean;
  labelledbyId: string;
  showValidation: boolean;
  range?: string;
  onChange(list: any[]): void;
  setTouched(): void;
  setValidity(isValid: boolean): void;
}

const defaultRange = parseRange('[0,Infinity)');
const generateId = htmlIdGenerator();

function NumberList({
  numberArray,
  labelledbyId,
  range,
  showValidation,
  unitName,
  validateAscendingOrder,
  onChange,
  setTouched,
  setValidity,
}: NumberListProps) {
  const numberRange = getRange(range);
  const [models, setModels] = useState(getInitList(numberArray));

  useEffect(
    () => {
      if (hasEmptyValues(models)) {
        setValidity(false);
      }
    },
    [models]
  );

  useEffect(
    () => {
      setModels(getUpdatedModels(numberArray, models));
    },
    [numberArray]
  );

  const onChangeValue = ({ id, value }: { id: string; value: string }) => {
    const parsedValue = parse(value, numberRange);
    const isValid =
      validateRange(parsedValue, numberRange) &&
      (validateAscendingOrder ? validateOrder(parsedValue, models, id) : true);
    setValidity(isValid);

    const currentModel = models.find(model => model.id === id);
    if (currentModel) {
      currentModel.value = parsedValue;
      currentModel.isInvalid = !isValid;
    }

    onUpdate(models);
  };

  const onAdd = () => {
    const newArray = [
      ...models,
      {
        id: generateId(),
        value: getNext(models, numberRange),
        isInvalid: false,
      },
    ];
    onUpdate(newArray);
  };

  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const onBlur = (model: NumberRowModel) => {
    if (model.value === EMPTY_STRING) {
      model.isInvalid = true;
    }
    setTouched();
  };

  const onUpdate = (modelList: NumberRowModel[]) => {
    setModels(modelList);
    onChange(modelList.map(({ value }) => (value === EMPTY_STRING ? undefined : value)));
  };

  return (
    <>
      {models.map(model => (
        <Fragment key={model.id}>
          <NumberRow
            isInvalid={showValidation ? model.isInvalid : false}
            disableDelete={models.length === 1}
            model={model}
            labelledbyId={labelledbyId}
            range={numberRange}
            onDelete={onDelete}
            onChange={onChangeValue}
            onBlur={() => onBlur(model)}
          />
          <EuiSpacer size="s" />
        </Fragment>
      ))}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton iconType="plusInCircle" fill={true} fullWidth={true} onClick={onAdd} size="s">
          <FormattedMessage
            id="common.ui.models.addUnitButtonLabel"
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
  return isNaN(parsedValue) ? '' : parsedValue;
}

function validateRange(value: number | '', range: Range) {
  if (value === '') {
    return false;
  }
  if (!range.within(value)) {
    return false;
  }
  return true;
}

function validateOrder(value: number | '', list: NumberRowModel[], id: string) {
  const currentModelIndex = list.findIndex(obj => obj.id === id);
  const previousModel = list[currentModelIndex - 1];
  if (previousModel && value <= previousModel.value) {
    return false;
  }
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

  const lastValue = last(list).value;
  const next = Number(lastValue) ? Number(lastValue) + 1 : 1;

  if (next < range.max) {
    return next;
  }

  return range.max - 1;
}

function getInitList(list: Array<number | undefined>): NumberRowModel[] {
  return list.length
    ? list.map(num => ({
        value: num === undefined ? EMPTY_STRING : num,
        id: generateId(),
        isInvalid: false,
      }))
    : [{ value: EMPTY_STRING, id: generateId(), isInvalid: true }];
}

function hasEmptyValues(modelList: NumberRowModel[]): boolean {
  return !!modelList.find(({ value }) => value === EMPTY_STRING);
}

function getUpdatedModels(
  numberList: Array<number | undefined>,
  modelList: NumberRowModel[]
): NumberRowModel[] {
  if (!numberList.length) {
    return modelList;
  }
  return numberList.map((number, index) => {
    const model = modelList[index] || { id: generateId() };
    const newValue = number === undefined ? EMPTY_STRING : number;
    return {
      ...model,
      value: newValue,
      isInvalid: newValue === model.value ? model.isInvalid : false,
    };
  });
}

export { NumberList };
