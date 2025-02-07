/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { EuiBreadcrumb } from '@elastic/eui';
import { WorkspaceTool } from '@kbn/core-workspace-state';
import { ReactNode } from 'react';

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
  getStateProvider: () => ({ children }: { children: ReactNode }) => JSX.Element;
}

export type WorkspaceStart = WorkspaceService;

export {
  WORKSPACE_KNOWN_TOOLS,
  WORKSPACE_TOOL_AI_ASSISTANT,
  WORKSPACE_TOOL_FEEDBACK,
  WORKSPACE_TOOL_HELP,
  WORKSPACE_TOOL_NEWSFEED,
  WORKSPACE_TOOL_PROFILE,
  WORKSPACE_TOOL_RECENT,
  type WorkspaceState,
  type WorkspaceStore,
  type WorkspaceToolProps,
  type WorkspaceKnownTool,
  type WorkspaceTool,
  type WorkspaceButtonProps,
} from '@kbn/core-workspace-state';
