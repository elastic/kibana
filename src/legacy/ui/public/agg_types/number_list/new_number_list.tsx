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

import { htmlIdGenerator, EuiSpacer, EuiButton, EuiFlexItem, EuiFormErrorText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
  validateAscendingOrder = true,
  onChange,
  setTouched,
  setValidity,
}: NumberListProps) {
  const numberRange = getRange(range);
  const [models, setModels] = useState(getInitList(numberArray));
  const [ascendingError, setAscendingError] = useState('');

  useEffect(
    () => {
      const updatedModels = getUpdatedModels(numberArray, models);
      if (validateAscendingOrder) {
        validateOrder(updatedModels);
      }
      setModels(updatedModels);
    },
    [numberArray]
  );

  useEffect(
    () => {
      setValidity(!hasInvalidValues(models));
    },
    [models]
  );

  function validateOrder(list: NumberRowModel[]) {
    let isInvalidOrder = false;
    list.forEach((model, index, array) => {
      const previousModel = array[index - 1];
      if (previousModel && model.value !== EMPTY_STRING) {
        model.isInvalid = model.value <= previousModel.value;

        if (model.isInvalid) {
          isInvalidOrder = true;
        }
      }
    });

    setAscendingError(
      isInvalidOrder
        ? i18n.translate('common.ui.aggTypes.numberList.invalidAscOrderErrorMessage', {
            defaultMessage: 'The values should be in ascending order.',
          })
        : ''
    );
  }

  const onChangeValue = ({ id, value }: { id: string; value: string }) => {
    const parsedValue = parse(value, numberRange);
    const { isValid, errors } = validateValue(parsedValue, id);
    setValidity(isValid);

    const currentModel = models.find(model => model.id === id);
    if (currentModel) {
      currentModel.value = parsedValue;
      currentModel.isInvalid = !isValid;
      currentModel.errors = errors;
    }

    onUpdate(models);
  };

  const validateValue = (value: number | '', id: string) => {
    const result = {
      isValid: true,
      errors: [] as string[],
    };

    if (value === EMPTY_STRING) {
      result.isValid = false;
    } else if (!numberRange.within(value)) {
      result.isValid = false;
      result.errors.push(
        i18n.translate('common.ui.aggTypes.numberList.invalidRangeErrorMessage', {
          defaultMessage: 'The value should be in the range: {range}.',
          values: { range: `[${numberRange.min}, ${numberRange.max}]` },
        })
      );
    }

    return result;
  };

  // Add an item to the end of the list
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
      {models.map((model, arrayIndex) => (
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
            autoFocus={arrayIndex === models.length - 1}
          />
          {model.errors && model.errors.length > 0 && (
            <EuiFormErrorText>{model.errors.join('\n')}</EuiFormErrorText>
          )}
          <EuiSpacer size="s" />
        </Fragment>
      ))}
      {ascendingError && <EuiFormErrorText>{ascendingError}</EuiFormErrorText>}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton iconType="plusInCircle" fill={true} fullWidth={true} onClick={onAdd} size="s">
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
  return isNaN(parsedValue) ? '' : parsedValue;
}

function getRange(range?: string) {
  try {
    return range ? parseRange(range) : defaultRange;
  } catch (e) {
    throw new TypeError('Unable to parse range: ' + e.message);
  }
}

function getNext(list: NumberRowModel[], range: Range): number | '' {
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

function hasInvalidValues(modelList: NumberRowModel[]): boolean {
  return !!modelList.find(({ isInvalid }) => isInvalid);
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
