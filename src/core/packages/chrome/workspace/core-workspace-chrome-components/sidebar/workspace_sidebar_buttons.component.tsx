/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { WorkspaceSidebarApp } from '@kbn/core-workspace-chrome-state';

import { WorkspaceSidebarButton } from './workspace_sidebar_button';

export interface WorkspaceSidebarButtonsComponentProps {
  apps: WorkspaceSidebarApp[];
  className?: string;
}

export const WorkspaceSidebarButtonsComponent = ({
  apps,
  ...props
}: WorkspaceSidebarButtonsComponentProps) => {
  // Filter apps based on isAvailable function
  const availableApps = apps.filter((app) => {
    return app.isAvailable ? app.isAvailable() : true;
  });

  return (
    <EuiFlexGroup gutterSize="s" {...props}>
      {availableApps.map(({ appId, size, button: { wrapper, ...buttonProps } }) => (
        <EuiFlexItem key={appId}>
          <WorkspaceSidebarButton {...{ appId, size, ...buttonProps }} context={wrapper} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
