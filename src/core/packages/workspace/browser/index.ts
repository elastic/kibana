/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type WorkspaceToolboxButtonProps,
  type WorkspaceToolProps,
} from '@kbn/core-workspace-components';
import { Observable } from 'rxjs';
import { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

export const WORKSPACE_TOOL_PROFILE = 'profile';
export const WORKSPACE_TOOL_NEWSFEED = 'newsfeed';

export const WORKSPACE_KNOWN_TOOLS = [
  WORKSPACE_TOOL_PROFILE,
  'aiAssistant',
  'search',
  'notifications',
  WORKSPACE_TOOL_NEWSFEED,
  'help',
] as const;

export type WorkspaceKnownTool = (typeof WORKSPACE_KNOWN_TOOLS)[number];

type ButtonProps = Omit<WorkspaceToolboxButtonProps, 'toolId'>;
type ToolProps = Omit<WorkspaceToolProps, 'toolId'>;

export interface WorkspaceTool {
  toolId: WorkspaceKnownTool | string;
  button: ButtonProps;
  tool: ToolProps;
  // TODO: reducer?: (state: any, action: any) => any;
}

export interface WorkspaceHeaderService {
  getBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
}

export interface WorkspaceToolboxService {
  getTools$: () => Observable<Array<Readonly<WorkspaceTool>>>;
  getTool$: (toolId: string | null) => Observable<WorkspaceTool | undefined>;
  registerTool: (tool: WorkspaceTool) => void;
}

export interface WorkspaceService {
  isEnabled: () => boolean;
  header: WorkspaceHeaderService;
  toolbox: WorkspaceToolboxService;
}

export type WorkspaceStart = WorkspaceService;
