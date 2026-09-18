/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSoloAgentWorkspaceWidth } from '../constants';

export const resolveAgentPanelTargetWidth = ({
  agentWorkspaceOpen,
  applicationWorkspaceOpen,
  agentPreferredWidth,
  navigationWidth,
  sidebarWidth,
  agentMarginLeft = 0,
  applicationMarginRight = 0,
}: {
  agentWorkspaceOpen: boolean;
  applicationWorkspaceOpen: boolean;
  agentPreferredWidth: number;
  navigationWidth: number;
  sidebarWidth: number;
  agentMarginLeft?: number;
  applicationMarginRight?: number;
}): number => {
  if (!agentWorkspaceOpen) {
    return 0;
  }

  if (!applicationWorkspaceOpen) {
    return getSoloAgentWorkspaceWidth({
      navigationWidth,
      sidebarWidth,
      agentMarginLeft,
      applicationMarginRight,
    });
  }

  return agentPreferredWidth;
};
