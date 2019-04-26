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
import { get } from 'lodash';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Range } from '../../utils/range';

interface NumberRowProps {
  disableDelete: boolean;
  isInvalid: boolean;
  labelledbyId: string;
  model: NumberRowModel;
  range: Range;
  onBlur(): void;
  onChange({ id, value }: { id: string; value: string }): void;
  onDelete(index: string): void;
}

export interface NumberRowModel {
  id: string;
  isInvalid: boolean;
  value: number | '';
}

function NumberRow({
  disableDelete,
  model,
  isInvalid,
  labelledbyId,
  range,
  onBlur,
  onDelete,
  onChange,
}: NumberRowProps) {
  const deleteBtnAriaLabel = i18n.translate('common.ui.numberList.removeUnitButtonAriaLabel', {
    defaultMessage: 'Remove this rank value',
  });

  const onValueChanged = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({
      value: get(event, 'target.value'),
      id: model.id,
    });

  return (
    <EuiFlexGroup responsive={false} alignItems="center">
      <EuiFlexItem>
        <EuiFieldNumber
          aria-labelledby={labelledbyId}
          isInvalid={isInvalid}
          onChange={onValueChanged}
          value={model.value}
          fullWidth={true}
          min={range.min}
          max={range.max}
          onBlur={onBlur}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={deleteBtnAriaLabel}>
          <EuiButtonIcon
            aria-label={deleteBtnAriaLabel}
            color="danger"
            iconType="trash"
            onClick={() => onDelete(model.id)}
            disabled={disableDelete}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { NumberRow };
