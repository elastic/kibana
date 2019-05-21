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

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Range } from '../../utils/range';

interface NumberRowProps {
  autoFocus: boolean;
  disableDelete: boolean;
  isInvalid: boolean;
  labelledbyId: string;
  model: NumberRowModel;
  range: Range;
  onBlur(): void;
  onFocus?(): void;
  onChange({ id, value }: { id: string; value: string }): void;
  onDelete(index: string): void;
}

export interface NumberRowModel {
  id: string;
  isInvalid: boolean;
  value: number | '';
  errors?: string[];
}

function NumberRow({
  autoFocus,
  disableDelete,
  model,
  isInvalid,
  labelledbyId,
  range,
  onBlur,
  onDelete,
  onFocus,
  onChange,
}: NumberRowProps) {
  const deleteBtnAriaLabel = i18n.translate(
    'common.ui.aggTypes.numberList.removeUnitButtonAriaLabel',
    {
      defaultMessage: 'Remove the rank value of {value}',
      values: { value: model.value },
    }
  );

  const onValueChanged = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({
      value: event.target.value,
      id: model.id,
    });

  return (
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber
          aria-labelledby={labelledbyId}
          autoFocus={autoFocus}
          compressed={true}
          isInvalid={isInvalid}
          placeholder={i18n.translate('common.ui.aggTypes.numberList.enterValuePlaceholder', {
            defaultMessage: 'Enter a value',
          })}
          onChange={onValueChanged}
          onFocus={onFocus}
          value={model.value}
          fullWidth={true}
          min={range.min}
          max={range.max}
          onBlur={onBlur}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={deleteBtnAriaLabel}
          title={deleteBtnAriaLabel}
          color="danger"
          iconType="trash"
          onClick={() => onDelete(model.id)}
          disabled={disableDelete}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { NumberRow };
