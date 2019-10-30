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

import React, { Fragment, useState, useEffect, useMemo, useCallback } from 'react';

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
import { useValidation } from '../../agg_utils';

export interface NumberListProps {
  labelledbyId: string;
  numberArray: Array<number | undefined>;
  range?: string;
  showValidation: boolean;
  unitName: string;
  validateAscendingOrder?: boolean;
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
  onChange,
  setTouched,
  setValidity,
}: NumberListProps) {
  const numberRange = useMemo(() => getRange(range), [range]);
  const [models, setModels] = useState(getInitModelList(numberArray));
  const [ascendingError, setAscendingError] = useState(EMPTY_STRING);

  // set up validity for each model
  useEffect(() => {
    let id: number | undefined;
    if (validateAscendingOrder) {
      const { isValidOrder, modelIndex } = validateOrder(numberArray);
      id = isValidOrder ? undefined : modelIndex;
      setAscendingError(
        isValidOrder
          ? EMPTY_STRING
          : i18n.translate('common.ui.aggTypes.numberList.invalidAscOrderErrorMessage', {
              defaultMessage: 'The values should be in ascending order.',
            })
      );
    }
    setModels(state => getUpdatedModels(numberArray, state, numberRange, id));
  }, [numberArray, numberRange, validateAscendingOrder]);

  // responsible for setting up an initial value ([0]) when there is no default value
  useEffect(() => {
    if (!numberArray.length) {
      onChange([models[0].value as number]);
    }
  }, []);

  const isValid = !hasInvalidValues(models);
  useValidation(setValidity, isValid);

  const onUpdate = useCallback(
    (modelList: NumberRowModel[]) => {
      setModels(modelList);
      onChange(modelList.map(({ value }) => (value === EMPTY_STRING ? undefined : value)));
    },
    [onChange]
  );

  const onChangeValue = useCallback(
    ({ id, value }: { id: string; value: string }) => {
      const parsedValue = parse(value);

      onUpdate(
        models.map(model => {
          if (model.id === id) {
            const { isInvalid, error } = validateValue(parsedValue, numberRange);
            return {
              id,
              value: parsedValue,
              isInvalid,
              error,
            };
          }
          return model;
        })
      );
    },
    [numberRange, models, onUpdate]
  );

  // Add an item to the end of the list
  const onAdd = useCallback(() => {
    const newArray = [...models, getNextModel(models, numberRange)];
    onUpdate(newArray);
  }, [models, numberRange, onUpdate]);

  const onDelete = useCallback(
    (id: string) => {
      const newArray = models.filter(model => model.id !== id);
      onUpdate(newArray);
    },
    [models, onUpdate]
  );

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
            onBlur={setTouched}
            autoFocus={models.length !== 1 && arrayIndex === models.length - 1}
          />
          {showValidation && model.isInvalid && model.error && (
            <EuiFormErrorText>{model.error}</EuiFormErrorText>
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
