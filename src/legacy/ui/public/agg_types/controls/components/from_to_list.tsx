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
  EuiFormLabel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import Ipv4Address from '../../../utils/ipv4_address';

export interface FromToObject {
  from: string;
  to: string;
}

interface FromToItem {
  value: string;
  isInvalid: boolean;
}

interface FromToModel {
  id: string;
  from: FromToItem;
  to: FromToItem;
}

interface FromToListProps {
  labelledbyId: string;
  list: FromToObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: FromToObject[]): void;
}

const generateId = htmlIdGenerator();

function FromToList({ labelledbyId, list, showValidation, onBlur, onChange }: FromToListProps) {
  const [models, setModels] = useState(
    list.map(item => ({
      id: generateId(),
      from: { value: item.from, isInvalid: false },
      to: { value: item.to, isInvalid: false },
    }))
  );

  const onUpdate = (modelList: FromToModel[]) => {
    setModels(modelList);
    onChange(modelList.map(({ from, to }) => ({ from: from.value, to: to.value })));
  };

  const onChangeValue = (modelName: 'from' | 'to', index: number, value: string) => {
    models[index][modelName].value = value;
    onUpdate(models);
  };
  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const getUpdatedModels = (objList: FromToObject[], modelList: FromToModel[]) => {
    return objList.map((item, index) => {
      const model = modelList[index] || {
        id: generateId(),
        from: { value: '', isInvalid: false },
        to: { value: '', isInvalid: false },
      };
      const from = validateValue(model.from.value);
      const to = validateValue(model.to.value);
      return {
        id: model.id,
        from,
        to,
      };
    });
  };

  const validateValue = (ipAddress: string) => {
    const result = {
      value: ipAddress,
      isInvalid: false,
    };
    if (!ipAddress) {
      result.isInvalid = true;
      return result;
    }
    try {
      new Ipv4Address(ipAddress);
      result.isInvalid = false;
      return result;
    } catch (e) {
      result.isInvalid = true;
      return result;
    }
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
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={`visEditorIpRangeFromLabel${labelledbyId}`}>
            <FormattedMessage id="common.ui.aggTypes.ipRanges.fromLabel" defaultMessage="From" />
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel htmlFor={`visEditorIpRangeToLabel${labelledbyId}`}>
            <FormattedMessage id="common.ui.aggTypes.ipRanges.toLabel" defaultMessage="To" />
          </EuiFormLabel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {models.map((item, index) => (
        <Fragment key={item.id}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <EuiFieldText
                aria-labelledby={`visEditorIpRangeFromLabel${labelledbyId}`}
                compressed={true}
                isInvalid={showValidation ? item.from.isInvalid : false}
                onChange={ev => {
                  onChangeValue('from', index, ev.target.value);
                }}
                value={item.from.value}
                onBlur={onBlur}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                aria-labelledby={`visEditorIpRangeToLabel${labelledbyId}`}
                compressed={true}
                isInvalid={showValidation ? item.to.isInvalid : false}
                onChange={ev => {
                  onChangeValue('to', index, ev.target.value);
                }}
                value={item.to.value}
                onBlur={onBlur}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate('common.ui.aggTypes.ipRanges.removeRangeAriaLabel', {
                  defaultMessage: 'Remove the range of {from} to {to}',
                  values: { from: item.from.value, to: item.to.value },
                })}
                title={i18n.translate('common.ui.aggTypes.ipRanges.removeRangeTitle', {
                  defaultMessage: 'Remove the range of {from} to {to}',
                  values: { from: item.from.value, to: item.to.value },
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

export { FromToList };
