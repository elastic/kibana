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

import { last } from 'lodash';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator } from '@elastic/eui';

import { parseRange, Range } from '../../utils/range';
import { NumberRowModel } from './number_row';

const EMPTY_STRING = '';
const defaultRange = parseRange('[0,Infinity)');
const generateId = htmlIdGenerator();

function parse(value: string) {
  const parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? EMPTY_STRING : parsedValue;
}

function getRange(range?: string): Range {
  try {
    return range ? parseRange(range) : defaultRange;
  } catch (e) {
    throw new TypeError('Unable to parse range: ' + e.message);
  }
}

function validateValue(value: number | '', numberRange: Range) {
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
        defaultMessage: 'The value should be in the range of {min} to {max}.',
        values: { min: numberRange.min, max: numberRange.max },
      })
    );
  }

  return result;
}

function validateOrder(list: NumberRowModel[]) {
  let isInvalidOrder = false;
  list.forEach((model, index, array) => {
    const previousModel = array[index - 1];
    if (previousModel && model.value !== EMPTY_STRING) {
      const isInvalidOrderOfItem = model.value <= previousModel.value;

      if (!model.isInvalid && isInvalidOrderOfItem) {
        model.isInvalid = true;
      }

      if (isInvalidOrderOfItem) {
        isInvalidOrder = true;
      }
    }
  });

  return isInvalidOrder;
}

function getNextModel(list: NumberRowModel[], range: Range): NumberRowModel {
  const lastValue = last(list).value;
  let next = Number(lastValue) ? Number(lastValue) + 1 : 1;

  if (next >= range.max) {
    next = range.max - 1;
  }

  return {
    id: generateId(),
    value: next,
    isInvalid: false,
  };
}

function getInitModelList(list: Array<number | undefined>): NumberRowModel[] {
  return list.length
    ? list.map(num => ({
        value: (num === undefined ? EMPTY_STRING : num) as NumberRowModel['value'],
        id: generateId(),
        isInvalid: false,
      }))
    : [{ value: 0, id: generateId(), isInvalid: false }];
}

function getUpdatedModels(
  numberList: Array<number | undefined>,
  modelList: NumberRowModel[],
  numberRange: Range
): NumberRowModel[] {
  if (!numberList.length) {
    return modelList;
  }
  return numberList.map((number, index) => {
    const model = modelList[index] || { id: generateId() };
    const newValue: NumberRowModel['value'] = number === undefined ? EMPTY_STRING : number;
    const { isValid, errors } = validateValue(newValue, numberRange);
    return {
      ...model,
      value: newValue,
      isInvalid: !isValid,
      errors,
    };
  });
}

function hasInvalidValues(modelList: NumberRowModel[]): boolean {
  return !!modelList.find(({ isInvalid }) => isInvalid);
}

export {
  EMPTY_STRING,
  parse,
  getRange,
  validateValue,
  validateOrder,
  getNextModel,
  getInitModelList,
  getUpdatedModels,
  hasInvalidValues,
};
