/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({ title, children }) => {
  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          <strong>{title}</strong>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </>
  );
};
