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
import { EuiFieldText, EuiFormLabel, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CidrMask } from '../../../utils/cidr_mask';
import { InputList, InputListConfig, InputObject } from './input_list';

export type MaskObject = InputObject & {
  mask: string;
};

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

function MaskList({ labelledbyId, showValidation, onBlur, ...rest }: MaskListProps) {
  const maskListConfig: InputListConfig = {
    defaultValue: {
      model: '0.0.0.0/1',
      value: '0.0.0.0/1',
      isInvalid: false,
    },
    validateClass: CidrMask,
    getModelValue: item => ({
      model: item.mask,
      value: item.mask,
      isInvalid: false,
    }),
    getModel: (models: MaskModel[], index) => models[index],
    getRemoveBtnAriaLabel: (item: MaskModel) =>
      i18n.translate('common.ui.aggTypes.ipRanges.removeCidrMaskButtonAriaLabel', {
        defaultMessage: 'Remove the CIDR mask value of {mask}',
        values: { mask: item.value },
      }),
    onChangeFn: ({ model }: MaskModel) => ({ mask: model }),
    hasInvalidValuesFn: ({ isInvalid }) => isInvalid,
    renderInputRow: (item: MaskModel, index, onChangeValue) => (
      <EuiFlexItem>
        <EuiFieldText
          aria-labelledby={`visEditorIpRangeCidrLabel${labelledbyId}`}
          isInvalid={showValidation ? item.isInvalid : false}
          onChange={ev => {
            onChangeValue(index, ev.target.value);
          }}
          value={item.value}
          onBlur={onBlur}
        />
      </EuiFlexItem>
    ),
    validateModel: (validateFn, object: MaskObject, model: MaskModel) => {
      validateFn(object.mask, model);
    },
  };
  const header = (
    <EuiFlexItem>
      <EuiFormLabel htmlFor={`visEditorIpRangeCidrLabel${labelledbyId}`}>
        <FormattedMessage
          id="common.ui.aggTypes.ipRanges.cidrMaskLabel"
          defaultMessage="CIDR Mask"
        />
      </EuiFormLabel>
    </EuiFlexItem>
  );

  return <InputList config={maskListConfig} header={header} {...rest} />;
}

export { MaskList };
