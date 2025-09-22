/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DeveloperToolbarContext } from '../context/developer_toolbar_context';

/**
 * Safe wrapper that renders developer toolbar items only when context is available.
 * This allows the DeveloperToolbar to work with or without the provider.
 */
export const CustomItemsPortal: React.FC = () => {
  // Directly use useContext to check if the context is available
  const context = useContext(DeveloperToolbarContext);

  // If no context available (no provider), render nothing
  if (!context) {
    return null;
  }

  const { enabledItems } = context;

  if (enabledItems.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {enabledItems.map((item) => (
        <EuiFlexItem key={item.id} grow={false}>
          {item.children}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
