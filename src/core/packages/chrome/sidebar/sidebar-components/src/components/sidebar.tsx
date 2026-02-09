/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';
import { SidebarPanel } from './sidebar_panel';
import { SidebarAppRenderer } from './sidebar_app_renderer';
import { useSidebar } from '../hooks';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SidebarProps {}

/**
 * @internal
 */
export function Sidebar(props: SidebarProps) {
  const { isOpen, currentAppId } = useSidebar();
  const sidebarService = useSidebarService();

  if (!isOpen) {
    return null;
  }

  if (!currentAppId || !sidebarService.hasApp(currentAppId)) {
    return null;
  }

  const currentApp = sidebarService.getAppDefinition(currentAppId);

  if (currentApp.status === 'inaccessible') {
    // most likely we're trying to render an app that hasn't become accessible yet after initial restoration
    return null;
  }

  return (
    <SidebarPanel>
      <SidebarAppRenderer
        key={currentAppId}
        appId={currentAppId}
        loadComponent={currentApp.loadComponent}
      />
    </SidebarPanel>
  );
}
