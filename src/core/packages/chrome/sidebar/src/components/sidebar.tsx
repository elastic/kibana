/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SidebarPanel } from './sidebar_panel';
import { SidebarAppRenderer } from './sidebar_app_renderer';
import { useSidebar } from '../hooks';
import { useSidebarService } from '../providers';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SidebarProps {}

export function Sidebar(props: SidebarProps) {
  const { close, isOpen, currentAppId } = useSidebar();
  const sidebarService = useSidebarService();

  if (!isOpen) {
    return null;
  }

  if (!currentAppId || !sidebarService.registry.hasApp(currentAppId)) {
    return null;
  }

  const currentApp = sidebarService.registry.getApp(currentAppId);

  if (!currentApp.available) {
    // most likely we're trying to render an app that hasn't become available yet after initial restoration
    return null;
  }

  return (
    <SidebarPanel title={currentApp.title} onClose={close}>
      <SidebarAppRenderer
        key={currentAppId}
        appId={currentAppId}
        loadComponent={currentApp.loadComponent}
      />
    </SidebarPanel>
  );
}
