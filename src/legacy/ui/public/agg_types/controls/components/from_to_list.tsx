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

import React from 'react';
import { EuiFormLabel, EuiFieldText, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import Ipv4Address from '../../../utils/ipv4_address';
import { InputList, InputListConfig, InputModel, InputObject } from './input_list';

const EMPTY_STRING = '';

export interface FromToObject extends InputObject {
  from?: string;
  to?: string;
}

interface FromToItem {
  model: string;
  value: string;
  isInvalid: boolean;
}

type FromToModel = InputModel & {
  from: FromToItem;
  to: FromToItem;
};

interface FromToListProps {
  labelledbyId: string;
  list: FromToObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: FromToObject[]): void;
  setValidity(isValid: boolean): void;
}

function FromToList({ labelledbyId, showValidation, onBlur, ...rest }: FromToListProps) {
  const fromToListConfig: InputListConfig = {
    defaultValue: {
      from: { value: '0.0.0.0', model: '0.0.0.0', isInvalid: false },
      to: { value: '255.255.255.255', model: '255.255.255.255', isInvalid: false },
    },
    defaultEmptyValue: {
      from: { value: EMPTY_STRING, model: EMPTY_STRING, isInvalid: false },
      to: { value: EMPTY_STRING, model: EMPTY_STRING, isInvalid: false },
    },
    validateClass: Ipv4Address,
    getModelValue: (item: FromToObject) => ({
      from: {
        value: item.from || EMPTY_STRING,
        model: item.from || EMPTY_STRING,
        isInvalid: false,
      },
      to: { value: item.to || EMPTY_STRING, model: item.to || EMPTY_STRING, isInvalid: false },
    }),
    getModel: (models: FromToModel[], index, modelName: 'from' | 'to') => models[index][modelName],
    getRemoveBtnAriaLabel: (item: FromToModel) =>
      i18n.translate('common.ui.aggTypes.ipRanges.removeRangeAriaLabel', {
        defaultMessage: 'Remove the range of {from} to {to}',
        values: { from: item.from.value, to: item.to.value },
      }),
    onChangeFn: ({ from, to }: FromToModel) => {
      const result: FromToObject = {};
      if (from.model) {
        result.from = from.model;
      }
      if (to.model) {
        result.to = to.model;
      }
      return result;
    },
    hasInvalidValuesFn: ({ from, to }: FromToModel) => from.isInvalid || to.isInvalid,
    renderInputRow: (item: FromToModel, index, onChangeValue) => (
      <>
        <EuiFlexItem>
          <EuiFieldText
            aria-labelledby={`visEditorIpRangeFromLabel${labelledbyId}`}
            isInvalid={showValidation ? item.from.isInvalid : false}
            placeholder="*"
            onChange={ev => {
              onChangeValue(index, ev.target.value, 'from');
            }}
            value={item.from.value}
            onBlur={onBlur}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldText
            aria-labelledby={`visEditorIpRangeToLabel${labelledbyId}`}
            isInvalid={showValidation ? item.to.isInvalid : false}
            placeholder="*"
            onChange={ev => {
              onChangeValue(index, ev.target.value, 'to');
            }}
            value={item.to.value}
            onBlur={onBlur}
          />
        </EuiFlexItem>
      </>
    ),
    validateModel: (validateFn, object: FromToObject, model: FromToModel) => {
      validateFn(object.from, model.from);
      validateFn(object.to, model.to);
    },
  };
  const header = (
    <>
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
    </>
  );

  return <InputList config={fromToListConfig} header={header} {...rest} />;
}

export { FromToList };
