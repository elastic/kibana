/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NumberListRange } from './range';

export interface NumberRowProps {
  autoFocus: boolean;
  disableDelete: boolean;
  isInvalid: boolean;
  labelledbyId: string;
  model: NumberRowModel;
  range: NumberListRange;
  onBlur(): void;
  onChange({ id, value }: { id: string; value: string }): void;
  onDelete(index: string): void;
}

export interface NumberRowModel {
  id: string;
  isInvalid: boolean;
  value: number | '';
  error?: string;
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
  onChange,
}: NumberRowProps) {
  const deleteBtnAriaLabel = i18n.translate(
    'visDefaultEditor.controls.numberList.removeUnitButtonAriaLabel',
    {
      defaultMessage: 'Remove the rank value of {value}',
      values: { value: model.value },
    }
  );

  const onValueChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({
        value: event.target.value,
        id: model.id,
      }),
    [onChange, model.id]
  );

  const onDeleteFn = useCallback(() => onDelete(model.id), [onDelete, model.id]);

  return (
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber
          aria-labelledby={labelledbyId}
          autoFocus={autoFocus}
          compressed={true}
          isInvalid={isInvalid}
          placeholder={i18n.translate(
            'visDefaultEditor.controls.numberList.enterValuePlaceholder',
            {
              defaultMessage: 'Enter a value',
            }
          )}
          onChange={onValueChanged}
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
          onClick={onDeleteFn}
          disabled={disableDelete}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { NumberRow };
