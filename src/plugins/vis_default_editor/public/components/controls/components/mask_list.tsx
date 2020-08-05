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

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { InputList, InputListConfig, InputObject, InputModel, InputItem } from './input_list';
import { search } from '../../../../../data/public';

const EMPTY_STRING = '';

export interface MaskObject extends InputObject {
  mask?: string;
}

type MaskModel = InputModel & {
  mask: InputItem;
};

interface MaskListProps {
  list: MaskObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: MaskObject[]): void;
  setValidity(isValid: boolean): void;
}

const defaultConfig = {
  defaultValue: {
    mask: { model: '0.0.0.0/1', value: '0.0.0.0/1', isInvalid: false },
  },
  validateClass: search.aggs.CidrMask,
  getModelValue: (item: MaskObject = {}) => ({
    mask: {
      model: item.mask || EMPTY_STRING,
      value: item.mask || EMPTY_STRING,
      isInvalid: false,
    },
  }),
  getRemoveBtnAriaLabel: (item: MaskModel) =>
    item.mask.value
      ? i18n.translate('visDefaultEditor.controls.ipRanges.removeCidrMaskButtonAriaLabel', {
          defaultMessage: 'Remove the CIDR mask value of {mask}',
          values: { mask: item.mask.value },
        })
      : i18n.translate('visDefaultEditor.controls.ipRanges.removeEmptyCidrMaskButtonAriaLabel', {
          defaultMessage: 'Remove the CIDR mask default value',
        }),
  onChangeFn: ({ mask }: MaskModel) => {
    if (mask.model) {
      return { mask: mask.model };
    }
    return {};
  },
  hasInvalidValuesFn: ({ mask }: MaskModel) => mask.isInvalid,
  modelNames: 'mask',
};

function MaskList({ showValidation, onBlur, ...rest }: MaskListProps) {
  const renderInputRow = useCallback(
    ({ mask }: MaskModel, index, onChangeValue) => (
      <EuiFlexItem>
        <EuiFieldText
          aria-label={i18n.translate('visDefaultEditor.controls.ipRanges.cidrMaskAriaLabel', {
            defaultMessage: 'CIDR mask: {mask}',
            values: { mask: mask.value || '*' },
          })}
          compressed
          fullWidth
          isInvalid={showValidation ? mask.isInvalid : false}
          placeholder="*"
          onChange={(ev) => {
            onChangeValue(index, ev.target.value, 'mask');
          }}
          value={mask.value}
          onBlur={onBlur}
        />
      </EuiFlexItem>
    ),
    [onBlur, showValidation]
  );
  const maskListConfig: InputListConfig = {
    ...defaultConfig,
    renderInputRow,
  };

  return <InputList config={maskListConfig} {...rest} />;
}

export { MaskList };
