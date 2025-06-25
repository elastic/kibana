/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { validateCellValue } from '../validations';
import { KibanaContextExtra } from '../types';

interface ValueInputProps {
  value?: string;
  columnName?: string;
  columns?: DatatableColumn[];
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onEnter?: (value: string) => void;
  onChange?: (value: string) => void;
  autoFocus: boolean;
  className?: string;
}

export const ValueInput = ({
  value = '',
  columnName = '',
  columns,
  onBlur,
  onEnter,
  onChange,
  autoFocus = false,
  className = '',
}: ValueInputProps) => {
  const {
    services: { notifications },
  } = useKibana<KibanaContextExtra>();
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | undefined>(undefined);

  const columnType = useMemo(() => {
    if (!columns || !columnName) return undefined;
    const col = columns.find((c) => c.name === columnName);
    return col?.meta?.type;
  }, [columns, columnName]);

  const validateValue = (val: string): string | undefined => {
    if (!columnType) return undefined;

    const validation = validateCellValue(val, columnType);

    if (validation) {
      notifications.toasts.addDanger({
        title: validation,
      });
    }
    return validation;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const validationError = validateValue(editValue);
      setError(validationError);
      if (!validationError) {
        onEnter?.(editValue);
      }
    }
  };

  const onBlurHandler = (event: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(event);
    }
    const validationError = validateValue(editValue);
    setError(validationError);
  };

  return (
    <EuiFieldText
      autoFocus={autoFocus}
      compressed
      placeholder={columnName}
      value={editValue}
      aria-label={i18n.translate('indexEditor.cellValueInput.aria', {
        defaultMessage: 'Value for {columnName}',
        values: { columnName },
      })}
      onChange={(e) => {
        setEditValue(e.target.value);
        setError(undefined);
        onChange?.(e.target.value);
      }}
      onBlur={onBlurHandler}
      onKeyDown={onKeyDown}
      className={className}
      isInvalid={!!error}
    />
  );
};
