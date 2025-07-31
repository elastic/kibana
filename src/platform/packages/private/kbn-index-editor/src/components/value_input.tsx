/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { EuiToolTip } from '@elastic/eui';
import { getInputComponentForType } from './value_inputs_factory';

interface ValueInputProps {
  value?: string;
  columnName?: string;
  columns?: DatatableColumn[];
  onBlur?: (event?: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  width?: number;
}

export const ValueInput: React.FC<ValueInputProps> = ({
  value = '',
  columnName = '',
  columns,
  onBlur,
  onChange,
  autoFocus = false,
  className = '',
  width,
}) => {
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const columnType = useMemo(() => {
    if (!columns || !columnName) return;
    const col = columns.find((c) => c.name === columnName);
    return col?.meta?.type;
  }, [columns, columnName]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (error) {
        event.preventDefault();
        return;
      }
    }
    if (event.key === 'Escape') {
      setEditValue(value);
      onChange?.(value);
      setError(null);
    }
  };

  const InputComponent = useMemo(() => {
    return getInputComponentForType(columnType);
  }, [columnType]);

  return (
    <EuiToolTip position="top" content={error}>
      <InputComponent
        autoFocus={autoFocus}
        placeholder={columnName}
        label={columnName}
        value={editValue}
        aria-label={i18n.translate('indexEditor.cellValueInput.aria', {
          defaultMessage: 'Value for {columnName}',
          values: { columnName },
        })}
        onChange={(e) => {
          setEditValue(e.target.value);
          onChange?.(e.target.value);
        }}
        onError={setError}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={className}
        css={width ? { width } : undefined}
      />
    </EuiToolTip>
  );
};

ValueInput.displayName = 'ValueInput';
