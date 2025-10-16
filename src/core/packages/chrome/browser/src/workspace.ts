/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { EuiBreadcrumb } from '@elastic/eui';
import type { NavigationStructure } from '@kbn/core-chrome-navigation';
import type { WorkspaceSidebarApp } from '@kbn/core-workspace-chrome-state';
import type { ChromeNavControl } from './nav_controls';

interface StateService<T> {
  getState: () => T;
}

export interface WorkspaceHeaderState {
  breadcrumbs: EuiBreadcrumb[];
  navControls: {
    left: ChromeNavControl[];
  };
}

export interface WorkspaceHeaderService extends StateService<WorkspaceHeaderState> {
  getBreadcrumbs: () => EuiBreadcrumb[];
}

export interface WorkspaceSidebarState {
  apps: WorkspaceSidebarApp[];
}

export interface WorkspaceSidebarService extends StateService<WorkspaceSidebarState> {
  registerSidebarApp: (app: WorkspaceSidebarApp) => void;
  getSidebarApps: () => WorkspaceSidebarApp[];
  getSidebarApp: (appId: string | null) => WorkspaceSidebarApp | undefined;
}

export interface WorkspaceNavigationState {
  items: NavigationStructure;
}

export interface WorkspaceNavigationService extends StateService<WorkspaceNavigationState> {
  getItems: () => NavigationStructure;
}

export interface WorkspaceServiceState {
  header: WorkspaceHeaderState;
  sidebar: WorkspaceSidebarState;
  navigation: WorkspaceNavigationState;
}

export interface WorkspaceService {
  header: WorkspaceHeaderService;
  sidebar: WorkspaceSidebarService;
  navigation: WorkspaceNavigationService;
  subscribe: (listener: () => void) => () => void;
  isEnabled: () => boolean;
  getState: () => WorkspaceServiceState;
  getStoreProvider: () => ({ children }: { children: ReactNode }) => JSX.Element;
}

export type WorkspaceServiceStart = WorkspaceService;

export {
  WORKSPACE_KNOWN_SIDEBAR_APPS,
  WORKSPACE_SIDEBAR_APP_AI_ASSISTANT,
  WORKSPACE_SIDEBAR_APP_FEEDBACK,
  WORKSPACE_SIDEBAR_APP_HELP,
  WORKSPACE_SIDEBAR_APP_NEWSFEED,
  WORKSPACE_SIDEBAR_APP_PROFILE,
  WORKSPACE_SIDEBAR_APP_RECENT,
  type WorkspaceState,
  type WorkspaceStore,
  type WorkspaceSidebarAppProps,
  type WorkspaceKnownSidebarApp,
  type WorkspaceSidebarApp,
  type WorkspaceButtonProps,
} from '@kbn/core-workspace-chrome-state';
