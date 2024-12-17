/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiIcon, EuiTitle, EuiText } from '@elastic/eui';

interface SearchEmptyPromptProps {
  actions?: React.ReactNode;
  body?: React.ReactNode;
  description?: string;
  icon?: string;
  title: string;
}

export const SearchEmptyPrompt: React.FC<SearchEmptyPromptProps> = ({
  actions,
  body,
  description,
  icon,
  title,
}) => {
  return (
    <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="column" gutterSize="l">
        {icon && (
          <EuiFlexItem>
            <EuiIcon size="xxl" type={icon} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {description && (
          <EuiFlexItem>
            <EuiText textAlign="center" color="subdued">
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        )}
        {body && <>{body}</>}
        {actions && (
          <EuiFlexGroup direction="row" gutterSize="m">
            {actions}
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
