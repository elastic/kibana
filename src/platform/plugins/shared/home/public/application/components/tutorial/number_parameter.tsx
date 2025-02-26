/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

export interface NumberParameterProps {
  id: string;
  label: string;
  value: number;
  setParameter: (id: string, float: number) => void;
}

export function NumberParameter({ id, label, value, setParameter }: NumberParameterProps) {
  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setParameter(id, parseFloat(evt.target.value));
  };

  return (
    <EuiFormRow label={label}>
      <EuiFieldNumber value={value} onChange={handleChange} fullWidth />
    </EuiFormRow>
  );
}
