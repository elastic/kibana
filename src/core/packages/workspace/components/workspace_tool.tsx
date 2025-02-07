/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useIsToolboxOpen } from './state';
import { WorkspaceToolComponent, WorkspaceToolComponentProps } from './workspace_tool.component';

export type WorkspaceToolProps = Pick<WorkspaceToolComponentProps, 'children'>;

export const WorkspaceTool = ({ children }: WorkspaceToolProps) => {
  const isOpen = useIsToolboxOpen();

  if (!isOpen) {
    return null;
  }

  return <WorkspaceToolComponent>{children}</WorkspaceToolComponent>;
};
