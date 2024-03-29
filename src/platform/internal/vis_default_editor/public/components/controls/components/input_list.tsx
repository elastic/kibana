/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { isEmpty, isEqual, mapValues, omitBy, pick } from 'lodash';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  htmlIdGenerator,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface InputListConfig {
  defaultValue: InputItemModel;
  validateClass: new (value: string) => { toString(): string };
  getModelValue(item?: InputObject): InputItemModel;
  getRemoveBtnAriaLabel(model: InputModel): string;
  onChangeFn(model: InputModel): InputObject;
  hasInvalidValuesFn(model: InputModel): boolean;
  renderInputRow(
    model: InputModel,
    index: number,
    onChangeFn: (index: number, value: string, modelName: string) => void
  ): React.ReactNode;
  modelNames: string | string[];
}
interface InputModelBase {
  id: string;
}
export type InputObject = object;
export interface InputItem {
  model: string;
  value: string;
  isInvalid: boolean;
}

interface InputItemModel {
  [model: string]: InputItem;
}

// InputModel can have the following implementations:
// for Mask List - { id: 'someId', mask: { model: '', value: '', isInvalid: false }}
// for FromTo List - { id: 'someId', from: { model: '', value: '', isInvalid: false }, to: { model: '', value: '', isInvalid: false }}
export type InputModel = InputModelBase & InputItemModel;

interface InputListProps {
  config: InputListConfig;
  list: InputObject[];
  onChange(list: InputObject[]): void;
  setValidity(isValid: boolean): void;
}

const generateId = htmlIdGenerator();
const validateValue = (
  inputValue: string | undefined,
  InputObject: InputListConfig['validateClass']
) => {
  const result = {
    model: inputValue || '',
    isInvalid: false,
  };
  if (!inputValue) {
    result.isInvalid = false;
    return result;
  }
  try {
    result.model = new InputObject(inputValue).toString();
    result.isInvalid = false;
    return result;
  } catch (e) {
    result.isInvalid = true;
    return result;
  }
};

function InputList({ config, list, onChange, setValidity }: InputListProps) {
  const { defaultValue, getModelValue, modelNames, onChangeFn, validateClass } = config;
  const [models, setModels] = useState(() =>
    list.map(
      (item) =>
        ({
          id: generateId(),
          ...getModelValue(item),
        } as InputModel)
    )
  );
  const hasInvalidValues = models.some(config.hasInvalidValuesFn);

  const updateValues = useCallback(
    (modelList: InputModel[]) => {
      setModels(modelList);
      onChange(modelList.map(onChangeFn));
    },
    [onChangeFn, onChange]
  );
  const onChangeValue = useCallback(
    (index: number, value: string, modelName: string) => {
      const { model, isInvalid } = validateValue(value, validateClass);
      updateValues(
        models.map((range, arrayIndex) =>
          arrayIndex === index
            ? {
                ...range,
                [modelName]: {
                  value,
                  model,
                  isInvalid,
                },
              }
            : range
        )
      );
    },
    [models, updateValues, validateClass]
  );
  const onDelete = useCallback(
    (id: string) => updateValues(models.filter((model) => model.id !== id)),
    [models, updateValues]
  );
  const onAdd = useCallback(
    () =>
      updateValues([
        ...models,
        {
          id: generateId(),
          ...getModelValue(),
        } as InputModel,
      ]),
    [getModelValue, models, updateValues]
  );

  useEffect(() => {
    // resposible for setting up an initial value when there is no default value
    if (!list.length) {
      updateValues([
        {
          id: generateId(),
          ...defaultValue,
        } as InputModel,
      ]);
    }
  }, [defaultValue, list.length, updateValues]);

  useEffect(() => {
    setValidity(!hasInvalidValues);
  }, [hasInvalidValues, setValidity]);

  useEffect(() => {
    // responsible for discarding changes
    if (
      list.length !== models.length ||
      list.some((item, index) => {
        // make model to be the same shape as stored value
        const model: InputObject = mapValues(pick(models[index], modelNames), 'model');

        // we need to skip empty values since they are not stored in saved object
        return !isEqual(item, omitBy(model, isEmpty));
      })
    ) {
      setModels(
        list.map(
          (item) =>
            ({
              id: generateId(),
              ...getModelValue(item),
            } as InputModel)
        )
      );
    }
  }, [getModelValue, list, modelNames, models]);

  return (
    <>
      {models.map((item, index) => (
        <Fragment key={item.id}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {config.renderInputRow(item, index, onChangeValue)}
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={config.getRemoveBtnAriaLabel(item)}
                title={config.getRemoveBtnAriaLabel(item)}
                disabled={models.length === 1}
                color="danger"
                iconType="trash"
                onClick={() => onDelete(item.id)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </Fragment>
      ))}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAdd} size="xs">
          <FormattedMessage
            id="visDefaultEditor.controls.ipRanges.addRangeButtonLabel"
            defaultMessage="Add range"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
}

export { InputList };
