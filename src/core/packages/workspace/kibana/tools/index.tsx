/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { WORKSPACE_TOOL_PROFILE, WorkspaceTool } from '@kbn/core-chrome-browser';
import { EuiAvatar } from '@elastic/eui';

export { RecentlyAccessedTool, type RecentlyAccessedToolProps } from './recently_accessed';
export { FeedbackTool } from './feedback';
export { WorkspaceToolbarSearchButton } from './search_button';

export const tools: WorkspaceTool[] = [
  {
    toolId: WORKSPACE_TOOL_PROFILE,
    button: {
      iconType: () => <EuiAvatar name="Clint Hall" size="s" />,
    },
    tool: {
      title: 'Profile',
      children: <div>Profile</div>,
    },
  },
];
