/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { last } from 'lodash';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator } from '@elastic/eui';

import { parseRange, NumberListRange } from './range';
import { NumberRowModel } from './number_row';

const EMPTY_STRING = '';
const defaultRange = parseRange('[0,Infinity)');
const generateId = htmlIdGenerator();
const defaultModel = { value: 0, id: generateId(), isInvalid: false };

function parse(value: string) {
  const parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? EMPTY_STRING : parsedValue;
}

function getRange(range?: string): NumberListRange {
  try {
    return range ? parseRange(range) : defaultRange;
  } catch (e) {
    throw new TypeError('Unable to parse range: ' + e.message);
  }
}

function validateValue(value: number | '', numberRange: NumberListRange) {
  const result: { isInvalid: boolean; error?: string } = {
    isInvalid: false,
  };

  if (value === EMPTY_STRING) {
    result.isInvalid = true;
    result.error = EMPTY_STRING;
  } else if (!numberRange.within(value)) {
    result.isInvalid = true;
    result.error = i18n.translate('visDefaultEditor.controls.numberList.invalidRangeErrorMessage', {
      defaultMessage: 'The value should be in the range of {min} to {max}.',
      values: { min: numberRange.min, max: numberRange.max },
    });
  }

  return result;
}

function validateValueAscending(
  inputValue: number | '',
  index: number,
  list: Array<number | undefined>
) {
  const result: { isInvalidOrder: boolean; error?: string } = {
    isInvalidOrder: false,
  };

  const previousModel = list[index - 1];
  if (
    previousModel !== undefined &&
    inputValue !== undefined &&
    inputValue !== '' &&
    inputValue <= previousModel
  ) {
    result.isInvalidOrder = true;
    result.error = i18n.translate(
      'visDefaultEditor.controls.numberList.invalidAscOrderErrorMessage',
      {
        defaultMessage: 'Value is not in ascending order.',
      }
    );
  }
  return result;
}

function validateValueUnique(
  inputValue: number | '',
  index: number,
  list: Array<number | undefined>
) {
  const result: { isDuplicate: boolean; error?: string } = {
    isDuplicate: false,
  };

  if (inputValue !== EMPTY_STRING && list.indexOf(inputValue) !== index) {
    result.isDuplicate = true;
    result.error = i18n.translate(
      'visDefaultEditor.controls.numberList.duplicateValueErrorMessage',
      {
        defaultMessage: 'Duplicate value.',
      }
    );
  }
  return result;
}

function getNextModel(list: NumberRowModel[], range: NumberListRange): NumberRowModel {
  const lastValue = (last(list) as NumberRowModel).value;
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

function getInitModelList(list: Array<number | undefined | ''>): NumberRowModel[] {
  return list.length
    ? list.map((num) => ({
        value: (num === undefined ? EMPTY_STRING : num) as NumberRowModel['value'],
        id: generateId(),
        isInvalid: false,
      }))
    : [defaultModel];
}

function getValidatedModels(
  numberList: Array<number | undefined>,
  modelList: NumberRowModel[],
  numberRange: NumberListRange,
  validateAscendingOrder: boolean = false,
  disallowDuplicates: boolean = false
): NumberRowModel[] {
  if (!numberList.length) {
    return [defaultModel];
  }
  return numberList.map((number, index) => {
    const model = modelList[index] || { id: generateId() };
    const newValue: NumberRowModel['value'] = number === undefined ? EMPTY_STRING : number;

    const valueResult = numberRange ? validateValue(newValue, numberRange) : { isInvalid: false };

    const ascendingResult = validateAscendingOrder
      ? validateValueAscending(newValue, index, numberList)
      : { isInvalidOrder: false };

    const duplicationResult = disallowDuplicates
      ? validateValueUnique(newValue, index, numberList)
      : { isDuplicate: false };

    const allErrors = [valueResult.error, ascendingResult.error, duplicationResult.error]
      .filter(Boolean)
      .join(' ');

    return {
      ...model,
      value: newValue,
      isInvalid:
        valueResult.isInvalid || ascendingResult.isInvalidOrder || duplicationResult.isDuplicate,
      error: allErrors === EMPTY_STRING ? undefined : allErrors,
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
  getNextModel,
  getInitModelList,
  getValidatedModels,
  hasInvalidValues,
};
