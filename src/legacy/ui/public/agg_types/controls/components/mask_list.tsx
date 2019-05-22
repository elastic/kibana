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
  EuiFieldText,
  EuiFormLabel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CidrMask } from '../../../utils/cidr_mask';

export interface MaskObject {
  mask: string;
}

interface MaskModel {
  id: string;
  model: string;
  value: string;
  isInvalid: boolean;
}

interface MaskListProps {
  labelledbyId: string;
  list: MaskObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: MaskObject[]): void;
  setValidity(isValid: boolean): void;
}

const generateId = htmlIdGenerator();

function MaskList({
  labelledbyId,
  list,
  showValidation,
  onBlur,
  onChange,
  setValidity,
}: MaskListProps) {
  const [models, setModels] = useState(
    list.length
      ? list.map(item => ({
          model: item.mask,
          value: item.mask,
          id: generateId(),
          isInvalid: false,
        }))
      : [{ id: generateId(), model: '0.0.0.0/1', value: '0.0.0.0/1', isInvalid: false }]
  );

  const onUpdate = (modelList: MaskModel[]) => {
    setModels(modelList);
    onChange(modelList.map(({ model }) => ({ mask: model })));
  };

  const onChangeValue = (index: number, value: string) => {
    const mask = models[index];
    const { model, isInvalid } = validateValue(value);
    mask.value = value;
    mask.model = model;
    mask.isInvalid = isInvalid;
    onUpdate(models);
  };
  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const validateValue = (mask: string) => {
    const result = {
      model: mask,
      isInvalid: false,
    };
    if (!mask) {
      result.isInvalid = true;
      return result;
    }
    try {
      result.model = new CidrMask(mask).toString();
      result.isInvalid = false;
      return result;
    } catch (e) {
      result.isInvalid = true;
      return result;
    }
  };

  const getUpdatedModels = (objList: MaskObject[], modelList: MaskModel[]) => {
    if (!objList.length) {
      return modelList;
    }
    return objList.map((item, index) => {
      const maskModel = modelList[index] || {
        id: generateId(),
        value: item.mask,
        model: item.mask,
        isInvalid: false,
      };
      const { model, isInvalid } = validateValue(item.mask);
      if (item.mask !== maskModel.model) {
        maskModel.value = model;
      }
      return {
        ...maskModel,
        model,
        isInvalid,
      };
    });
  };

  const hasInvalidValues = (modelList: MaskModel[]) => {
    return !!modelList.find(({ isInvalid }) => isInvalid);
  };

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

  // resposible for setting up an initial value ([mask: '0.0.0.0/1']) when there is no default value
  useEffect(() => {
    onChange(models.map(({ model }) => ({ mask: model })));
  }, []);

  if (!list || !list.length) {
    return null;
  }

  return (
    <>
      <EuiFlexItem className="euiFormLabel">
        <EuiFormLabel htmlFor={`visEditorIpRangeCidrLabel${labelledbyId}`}>
          <FormattedMessage
            id="common.ui.aggTypes.ipRanges.cidrMaskLabel"
            defaultMessage="CIDR Mask"
          />
        </EuiFormLabel>
      </EuiFlexItem>
      <EuiSpacer size="xs" />
      {models.map((item, index) => (
        <Fragment key={item.id}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <EuiFieldText
                aria-labelledby={`visEditorIpRangeCidrLabel${labelledbyId}`}
                compressed={true}
                isInvalid={showValidation ? item.isInvalid : false}
                onChange={ev => {
                  onChangeValue(index, ev.target.value);
                }}
                value={item.value}
                onBlur={onBlur}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'common.ui.aggTypes.ipRanges.removeCidrMaskButtonAriaLabel',
                  {
                    defaultMessage: 'Remove the CIDR mask value of {mask}',
                    values: { mask: item.value },
                  }
                )}
                title={i18n.translate('common.ui.aggTypes.ipRanges.removeCidrMaskButtonTitle', {
                  defaultMessage: 'Remove the CIDR mask value of {mask}',
                  values: { mask: item.value },
                })}
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
    </>
  );
}

export { MaskList };
