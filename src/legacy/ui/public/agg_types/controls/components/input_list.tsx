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

import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  htmlIdGenerator,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface InputListConfig {
  defaultValue: InputItemModel;
  defaultEmptyValue: InputItemModel;
  validateClass: new (value: string) => { toString(): string };
  getModelValue(item: InputObject): InputItemModel;
  getRemoveBtnAriaLabel(model: InputModel): string;
  onChangeFn(model: InputModel): InputObject;
  hasInvalidValuesFn(model: InputModel): boolean;
  renderInputRow(
    model: InputModel,
    index: number,
    onChangeFn: (index: number, value: string, modelName: string) => void
  ): React.ReactNode;
  validateModel(
    validateFn: (value: string | undefined, modelObj: InputItem) => void,
    object: InputObject,
    model: InputModel
  ): void;
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

function InputList({ config, list, onChange, setValidity }: InputListProps) {
  const [models, setModels] = useState(
    list.length
      ? list.map(
          item =>
            ({
              id: generateId(),
              ...config.getModelValue(item),
            } as InputModel)
        )
      : [
          {
            id: generateId(),
            ...config.defaultValue,
          } as InputModel,
        ]
  );

  const onUpdate = (modelList: InputModel[]) => {
    setModels(modelList);
    onChange(modelList.map(config.onChangeFn));
  };

  const onChangeValue = (index: number, value: string, modelName: string) => {
    const range = models[index][modelName];
    const { model, isInvalid } = validateValue(value);
    range.value = value;
    range.model = model;
    range.isInvalid = isInvalid;
    onUpdate(models);
  };
  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const onAdd = () => {
    const newArray = [
      ...models,
      {
        id: generateId(),
        ...config.defaultEmptyValue,
      } as InputModel,
    ];
    onUpdate(newArray);
  };

  const getUpdatedModels = (objList: InputObject[], modelList: InputModel[]) => {
    if (!objList.length) {
      return modelList;
    }
    return objList.map((item, index) => {
      const model = modelList[index] || {
        id: generateId(),
        ...config.getModelValue(item),
      };

      config.validateModel(validateItem, item, model);

      return model;
    });
  };

  const validateItem = (value: string | undefined, modelObj: InputItem) => {
    const { model, isInvalid } = validateValue(value);
    if (value !== modelObj.model) {
      modelObj.value = model;
    }
    modelObj.model = model;
    modelObj.isInvalid = isInvalid;
  };

  const validateValue = (inputValue: string | undefined) => {
    const result = {
      model: inputValue || '',
      isInvalid: false,
    };
    if (!inputValue) {
      result.isInvalid = false;
      return result;
    }
    try {
      const InputObject = config.validateClass;
      result.model = new InputObject(inputValue).toString();
      result.isInvalid = false;
      return result;
    } catch (e) {
      result.isInvalid = true;
      return result;
    }
  };

  const hasInvalidValues = (modelList: InputModel[]) => {
    return !!modelList.find(config.hasInvalidValuesFn);
  };

  // responsible for discarding changes
  useEffect(
    () => {
      setModels(getUpdatedModels(list, models));
    },
    [list]
  );

  useEffect(
    () => {
      setValidity(!hasInvalidValues(models));
    },
    [models]
  );

  // resposible for setting up an initial value when there is no default value
  useEffect(() => {
    onChange(models.map(config.onChangeFn));
  }, []);

  if (!list || !list.length) {
    return null;
  }

  return (
    <>
      {models.map((item, index) => (
        <Fragment key={item.id}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
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
            id="common.ui.aggTypes.ipRanges.addRangeButtonLabel"
            defaultMessage="Add range"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
}

export { InputList };
