/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFormRow, EuiFieldText } from '@elastic/eui';

export interface Props {
  id: string;
  label: string;
  value: string;
  setParameter: (id: string, value: string) => void;
}
export function StringParameter({ id, label, value, setParameter }: Props) {
  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setParameter(id, evt.target.value);
  };

  return (
    <EuiFormRow label={label}>
      <EuiFieldText value={value} onChange={handleChange} fullWidth />
    </EuiFormRow>
  );
}
