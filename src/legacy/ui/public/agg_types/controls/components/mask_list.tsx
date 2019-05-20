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

interface MaskModel extends MaskObject {
  id: string;
  isInvalid: boolean;
}

interface MaskListProps {
  labelledbyId: string;
  list: MaskObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: MaskObject[]): void;
}

const generateId = htmlIdGenerator();

function MaskList({ labelledbyId, list, showValidation, onBlur, onChange }: MaskListProps) {
  const [models, setModels] = useState(
    list.map(item => ({ ...item, id: generateId(), isInvalid: false }))
  );
  const deleteBtnAriaLabel = i18n.translate(
    'common.ui.aggTypes.ipRanges.removeCidrMaskButtonAriaLabel',
    {
      defaultMessage: 'Remove this CIDR mask',
    }
  );

  const onUpdate = (modelList: MaskModel[]) => {
    setModels(modelList);
    onChange(modelList.map(({ mask }) => ({ mask })));
  };

  const onChangeValue = (index: number, value: string) => {
    models[index].mask = value;
    onUpdate(models);
  };
  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const validateValue = (mask: string) => {
    const result = {
      value: mask,
      isInvalid: false,
    };
    if (!mask) {
      result.isInvalid = true;
      return result;
    }
    try {
      new CidrMask(mask);
      result.isInvalid = false;
      return result;
    } catch (e) {
      result.isInvalid = true;
      return result;
    }
  };

  const getUpdatedModels = (objList: MaskObject[], modelList: MaskModel[]) => {
    return objList.map((item, index) => {
      const model = modelList[index] || { id: generateId(), mask: '', isInvalid: false };
      const { value, isInvalid } = validateValue(model.mask);
      return {
        ...model,
        value,
        isInvalid,
      };
    });
  };

  useEffect(
    () => {
      setModels(getUpdatedModels(list, models));
    },
    [list]
  );

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
                isInvalid={showValidation ? item.isInvalid : false}
                onChange={ev => {
                  onChangeValue(index, ev.target.value);
                }}
                value={item.mask}
                onBlur={onBlur}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={deleteBtnAriaLabel}
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
