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
  model: string;
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
  setValidity(isValid: boolean): void;
}

const generateId = htmlIdGenerator();

function FromToList({
  labelledbyId,
  list,
  showValidation,
  onBlur,
  onChange,
  setValidity,
}: FromToListProps) {
  const [ranges, setRanges] = useState(
    list.length
      ? list.map(item => ({
          id: generateId(),
          from: { value: item.from, model: item.from, isInvalid: false },
          to: { value: item.to, model: item.to, isInvalid: false },
        }))
      : [
          {
            id: generateId(),
            from: { value: '0.0.0.0', model: '0.0.0.0', isInvalid: false },
            to: { value: '255.255.255.255', model: '255.255.255.255', isInvalid: false },
          },
        ]
  );

  const onUpdate = (modelList: FromToModel[]) => {
    setRanges(modelList);
    onChange(modelList.map(({ from, to }) => ({ from: from.model, to: to.model })));
  };

  const onChangeValue = (modelName: 'from' | 'to', index: number, value: string) => {
    const range = ranges[index][modelName];
    const { model, isInvalid } = validateValue(value);
    range.value = value;
    range.model = model;
    range.isInvalid = isInvalid;
    onUpdate(ranges);
  };
  const onDelete = (id: string) => {
    const newArray = ranges.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const getUpdatedModels = (objList: FromToObject[], rangeList: FromToModel[]) => {
    if (!objList.length) {
      return rangeList;
    }
    return objList.map((item, index) => {
      const range = rangeList[index] || {
        id: generateId(),
        from: { value: item.from, model: item.from, isInvalid: false },
        to: { value: item.to, model: item.to, isInvalid: false },
      };

      validateItem(item.from, range.from);
      validateItem(item.to, range.to);

      return {
        ...range,
      };
    });
  };

  const validateItem = (value: string, modelObj: FromToItem) => {
    const { model, isInvalid } = validateValue(value);
    if (value !== modelObj.model) {
      modelObj.value = model;
    }
    modelObj.model = model;
    modelObj.isInvalid = isInvalid;
  };

  const validateValue = (ipAddress: string) => {
    const result = {
      model: ipAddress,
      isInvalid: false,
    };
    if (!ipAddress) {
      result.isInvalid = true;
      return result;
    }
    try {
      result.model = new Ipv4Address(ipAddress).toString();
      result.isInvalid = false;
      return result;
    } catch (e) {
      result.isInvalid = true;
      return result;
    }
  };

  const hasInvalidValues = (modelList: FromToModel[]) => {
    return !!modelList.find(({ from, to }) => from.isInvalid || to.isInvalid);
  };

  useEffect(
    () => {
      setRanges(getUpdatedModels(list, ranges));
    },
    [list]
  );

  useEffect(
    () => {
      setValidity(!hasInvalidValues(ranges));
    },
    [ranges]
  );

  // resposible for setting up an initial value ([from: '0.0.0.0', to: '255.255.255.255' ]) when there is no default value
  useEffect(() => {
    onChange(ranges.map(({ from, to }) => ({ from: from.model, to: to.model })));
  }, []);

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
      {ranges.map((item, index) => (
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
                disabled={ranges.length === 1}
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
