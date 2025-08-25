/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useDeveloperToolbarContext } from '../context/developer_toolbar_context';

/**
 * Component that renders all registered developer toolbar actions.
 * This is used internally by the DeveloperToolbar component.
 */
export const ActionsPortal: React.FC = () => {
  const { actions } = useDeveloperToolbarContext();

  if (actions.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {actions.map((action) => (
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
