/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export interface ExtraAction {
  id: string;
  content: React.ReactNode;
  showInReadOnly?: boolean;
}

interface ExtraActionsBarProps {
  actions: ExtraAction[];
  isReadOnly: boolean;
}

export const ExtraActionsBar = React.memo(function ExtraActionsBar({
  actions,
  isReadOnly,
}: ExtraActionsBarProps) {
  const visibleActions = actions.filter((action) => !isReadOnly || action.showInReadOnly !== false);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {visibleActions.map((action) => (
        <EuiFlexItem key={action.id} grow={false}>
          {action.content}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
