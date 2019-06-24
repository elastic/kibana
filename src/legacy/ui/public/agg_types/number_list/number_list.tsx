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

import { EuiSpacer, EuiButtonEmpty, EuiFlexItem, EuiFormErrorText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { NumberRow, NumberRowModel } from './number_row';
import {
  parse,
  EMPTY_STRING,
  getRange,
  validateOrder,
  validateValue,
  getNextModel,
  getInitModelList,
  getUpdatedModels,
  hasInvalidValues,
} from './utils';

interface NumberListProps {
  labelledbyId: string;
  numberArray: Array<number | undefined>;
  range?: string;
  showValidation: boolean;
  unitName: string;
  validateAscendingOrder?: boolean;
  onBlur?(): void;
  onFocus?(): void;
  onChange(list: Array<number | undefined>): void;
  setTouched(): void;
  setValidity(isValid: boolean): void;
}

function NumberList({
  labelledbyId,
  numberArray,
  range,
  showValidation,
  unitName,
  validateAscendingOrder = true,
  onBlur,
  onFocus,
  onChange,
  setTouched,
  setValidity,
}: NumberListProps) {
  const numberRange = getRange(range);
  const [models, setModels] = useState(getInitModelList(numberArray));
  const [ascendingError, setAscendingError] = useState(EMPTY_STRING);

  // responsible for discarding changes
  useEffect(
    () => {
      const updatedModels = getUpdatedModels(numberArray, models, numberRange);
      if (validateAscendingOrder) {
        const isOrderValid = validateOrder(updatedModels);
        setAscendingError(
          isOrderValid
            ? i18n.translate('common.ui.aggTypes.numberList.invalidAscOrderErrorMessage', {
                defaultMessage: 'The values should be in ascending order.',
              })
            : EMPTY_STRING
        );
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

  // resposible for setting up an initial value ([0]) when there is no default value
  useEffect(() => {
    onChange(models.map(({ value }) => (value === EMPTY_STRING ? undefined : value)));
  }, []);

  const onChangeValue = ({ id, value }: { id: string; value: string }) => {
    const parsedValue = parse(value);
    const { isValid, errors } = validateValue(parsedValue, numberRange);
    setValidity(isValid);

    const currentModel = models.find(model => model.id === id);
    if (currentModel) {
      currentModel.value = parsedValue;
      currentModel.isInvalid = !isValid;
      currentModel.errors = errors;
    }

    onUpdate(models);
  };

  // Add an item to the end of the list
  const onAdd = () => {
    const newArray = [...models, getNextModel(models, numberRange)];
    onUpdate(newArray);
  };

  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const onBlurFn = (model: NumberRowModel) => {
    if (model.value === EMPTY_STRING) {
      model.isInvalid = true;
    }
    setTouched();
    if (onBlur) {
      onBlur();
    }
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
            onFocus={onFocus}
            onChange={onChangeValue}
            onBlur={() => onBlurFn(model)}
            autoFocus={models.length !== 1 && arrayIndex === models.length - 1}
          />
          {showValidation && model.isInvalid && model.errors && model.errors.length > 0 && (
            <EuiFormErrorText>{model.errors.join('\n')}</EuiFormErrorText>
          )}
          {models.length - 1 !== arrayIndex && <EuiSpacer size="s" />}
        </Fragment>
      ))}
      {showValidation && ascendingError && <EuiFormErrorText>{ascendingError}</EuiFormErrorText>}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAdd} size="xs">
          <FormattedMessage
            id="common.ui.aggTypes.numberList.addUnitButtonLabel"
            defaultMessage="Add {unitName}"
            values={{ unitName }}
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
}

export { NumberList };
