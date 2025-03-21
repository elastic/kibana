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
import { WORKSPACE_KNOWN_TOOLS } from './tools';

export type WorkspaceKnownTool = (typeof WORKSPACE_KNOWN_TOOLS)[number];

interface ButtonProps extends Pick<EuiButtonIconPropsForButton, 'iconType'> {
  size?: 'regular' | 'wide' | 'fullWidth';
  'aria-label'?: string;
}
export interface ToolProps extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
}

export interface WorkspaceTool {
  toolId: WorkspaceKnownTool | string;
  button: ButtonProps;
  tool: ToolProps;
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
