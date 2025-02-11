/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiTitle, EuiSpacer, EuiText, EuiHorizontalRule } from '@elastic/eui';

export interface DevToolsSettingsModalProps {
  title: string;
  description?: string;
}

export const SettingsGroup = ({ title, description }: DevToolsSettingsModalProps) => {
  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>{title}</h2>
      </EuiTitle>
      {description && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}
      <EuiHorizontalRule margin="s" />
    </>
  );
};
