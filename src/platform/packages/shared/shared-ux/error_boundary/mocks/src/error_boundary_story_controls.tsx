/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

export const Spacer: React.FC = () => <div style={{ height: 12 }} />;

export const ControlsBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
);

export const DocsBlock: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ marginTop: 12, padding: 12, border: '1px dashed #ccc', borderRadius: 6 }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
    <div style={{ lineHeight: 1.5 }}>{children}</div>
  </div>
);

export const StoryActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  color?:
    | 'primary'
    | 'danger'
    | 'success'
    | 'warning'
    | 'text'
    | 'accent'
    | 'accentSecondary'
    | 'neutral'
    | 'risk'
    | undefined;
  fill?: boolean;
  disabled?: boolean;
}> = ({ onClick, children, color = 'danger', fill = true, disabled }) => {
  return (
    <EuiButton
      color={color}
      onClick={onClick}
      fill={fill}
      isDisabled={disabled}
      style={{ margin: 4 }}
      size="s"
    >
      {children}
    </EuiButton>
  );
};
