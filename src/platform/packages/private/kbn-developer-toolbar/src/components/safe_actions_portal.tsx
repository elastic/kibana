/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { DeveloperToolbarContext } from '../context/developer_toolbar_context';

/**
 * Safe wrapper that renders developer toolbar actions only when context is available.
 * This allows the DeveloperToolbar to work with or without the provider.
 */
export const SafeActionsPortal: React.FC = () => {
  // Directly use useContext to check if the context is available
  const context = useContext(DeveloperToolbarContext);

  // If no context available (no provider), render nothing
  if (!context) {
    return null;
  }

  const { enabledActions } = context;

  if (enabledActions.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {enabledActions.map((action) => (
        <EuiFlexItem key={action.id} grow={false}>
          {action.tooltip ? (
            <EuiToolTip content={action.tooltip}>
              <span>{action.children}</span>
            </EuiToolTip>
          ) : (
            action.children
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
