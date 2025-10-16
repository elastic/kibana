/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonIconPropsForButton, EuiPanelProps } from '@elastic/eui';
import type { ReactNode } from 'react';

export const WORKSPACE_SIDEBAR_APP_PROFILE = 'profile';
export const WORKSPACE_SIDEBAR_APP_RECENT = 'recent';
export const WORKSPACE_SIDEBAR_APP_FEEDBACK = 'feedback';
export const WORKSPACE_SIDEBAR_APP_NEWSFEED = 'newsfeed';
export const WORKSPACE_SIDEBAR_APP_HELP = 'help';
export const WORKSPACE_SIDEBAR_APP_AI_ASSISTANT = 'aiAssistant';

export const WORKSPACE_KNOWN_SIDEBAR_APPS = [
  WORKSPACE_SIDEBAR_APP_PROFILE,
  WORKSPACE_SIDEBAR_APP_AI_ASSISTANT,
  WORKSPACE_SIDEBAR_APP_FEEDBACK,
  WORKSPACE_SIDEBAR_APP_RECENT,
  WORKSPACE_SIDEBAR_APP_NEWSFEED,
  WORKSPACE_SIDEBAR_APP_HELP,
] as const;

export type WorkspaceKnownSidebarApp = (typeof WORKSPACE_KNOWN_SIDEBAR_APPS)[number];

export interface WorkspaceButtonProps extends Pick<EuiButtonIconPropsForButton, 'iconType'> {
  size?: 'regular' | 'wide' | 'fullWidth';
  'aria-label'?: string;
  /**
   * Optional function that wraps the rendered button in a custom container.
   * Receives the button element as a parameter and should return the wrapped element.
   */
  wrapper?: (button: ReactNode) => ReactNode;
}

export interface WorkspaceSidebarAppProps
  extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
}

export interface WorkspaceSidebarApp {
  appId: WorkspaceKnownSidebarApp | string;
  button: WorkspaceButtonProps;
  app: WorkspaceSidebarAppProps;
  size?: 'regular' | 'wide' | 'fullWidth';
  isAvailable?: () => boolean;
  // TODO: reducer?: (state: any, action: any) => any;
}
