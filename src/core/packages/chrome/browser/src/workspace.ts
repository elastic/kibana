/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { EuiButtonIconPropsForButton, EuiPanelProps, EuiBreadcrumb } from '@elastic/eui';
import type { ReactNode } from 'react';

export const WORKSPACE_TOOL_PROFILE = 'profile';
export const WORKSPACE_TOOL_RECENT = 'recent';
export const WORKSPACE_TOOL_FEEDBACK = 'feedback';
export const WORKSPACE_TOOL_NEWSFEED = 'newsfeed';
export const WORKSPACE_TOOL_HELP = 'help';
export const WORKSPACE_TOOL_AI_ASSISTANT = 'aiAssistant';

export const WORKSPACE_KNOWN_TOOLS = [
  WORKSPACE_TOOL_PROFILE,
  WORKSPACE_TOOL_RECENT,
  WORKSPACE_TOOL_NEWSFEED,
  WORKSPACE_TOOL_FEEDBACK,
  WORKSPACE_TOOL_HELP,
  WORKSPACE_TOOL_AI_ASSISTANT,
] as const;

export type WorkspaceKnownTool = (typeof WORKSPACE_KNOWN_TOOLS)[number];

export interface WorkspaceButtonProps extends Pick<EuiButtonIconPropsForButton, 'iconType'> {
  size?: 'regular' | 'wide' | 'fullWidth';
  'aria-label'?: string;
}
export interface WorkspaceToolProps
  extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
}

export interface WorkspaceTool {
  toolId: WorkspaceKnownTool | string;
  button: WorkspaceButtonProps;
  tool: WorkspaceToolProps;
  size?: 'regular' | 'wide' | 'fullWidth';
  // TODO: reducer?: (state: any, action: any) => any;
}

export interface WorkspaceHeaderService {
  getBreadcrumbs$: () => Observable<EuiBreadcrumb[]>;
}

export interface WorkspaceToolboxService {
  getTools$: () => Observable<Array<Readonly<WorkspaceTool>>>;
  getTool$: (toolId: string | null) => Observable<WorkspaceTool | undefined>;
  registerSearchControl: (control: JSX.Element) => void;
  getSearchControl: () => JSX.Element | null;
  registerTool: (tool: WorkspaceTool) => void;
}

export interface WorkspaceService {
  isEnabled: () => boolean;
  header: WorkspaceHeaderService;
  toolbox: WorkspaceToolboxService;
}

export type WorkspaceStart = WorkspaceService;
