/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_AGENT_ID,
  dashboardAttachments,
  type DashboardAttachmentData,
  type DashboardAttachmentPanel,
  type DashboardAttachmentSection,
} from '@kbn/dashboard-agent-common';
import type { DashboardApi } from '../../dashboard_api/types';
import { agentBuilderService } from '../../services/kibana_services';
import { isDashboardSection, type DashboardState } from '../../../common';

/**
 * Converts a panel to the attachment format
 */
const toAttachmentPanel = (panel: {
  type: string;
  uid?: string;
  config: unknown;
}): DashboardAttachmentPanel => ({
  type: panel.type,
  uid: panel.uid,
  config: panel.config as Record<string, unknown>,
});

/**
 * Extracts panels and sections from the serialized dashboard state
 */
function extractPanelsAndSections(panels: DashboardState['panels']): {
  panels: DashboardAttachmentPanel[];
  sections: DashboardAttachmentSection[];
} {
  if (!panels || panels.length === 0) {
    return { panels: [], sections: [] };
  }

  const topLevelPanels: DashboardAttachmentPanel[] = [];
  const sections: DashboardAttachmentSection[] = [];

  for (const item of panels) {
    if (isDashboardSection(item)) {
      sections.push({
        title: item.title,
        panels: item.panels?.map(toAttachmentPanel) ?? [],
      });
    } else {
      topLevelPanels.push(toAttachmentPanel(item));
    }
  }

  return { panels: topLevelPanels, sections };
}

/**
 * Hook that sets up the agent builder context when viewing a dashboard.
 * This attaches the current dashboard information to the agent builder flyout,
 * allowing users to "chat" with their dashboard.
 */
export function useAgentBuilderContext({
  dashboardApi,
  savedDashboardId,
}: {
  dashboardApi: DashboardApi | undefined;
  savedDashboardId: string | undefined;
}) {
  useEffect(
    function setDashboardAttachment() {
      if (!agentBuilderService || !dashboardApi) {
        return;
      }

      const { attributes } = dashboardApi.getSerializedState();

      const panelCount = dashboardApi.getPanelCount();
      const { panels, sections } = extractPanelsAndSections(attributes.panels);

      const dashboardTitle = attributes.title || 'Untitled Dashboard';
      const dashboardDescription = attributes.description || undefined;

      const attachmentData: DashboardAttachmentData = {
        dashboardId: savedDashboardId,
        title: dashboardTitle,
        description: dashboardDescription,
        panelCount,
        panels: panels.length > 0 ? panels : undefined,
        sections: sections.length > 0 ? sections : undefined,
        attachmentLabel: dashboardTitle,
      };

      const dashboardAttachment: AttachmentInput = {
        id: savedDashboardId ? `dashboard-${savedDashboardId}` : undefined,
        type: dashboardAttachments.dashboard,
        data: attachmentData as unknown as Record<string, unknown>,
      };

      // Set the flyout configuration with the dashboard attachment
      agentBuilderService.setConversationFlyoutActiveConfig({
        sessionTag: 'dashboard',
        agentId: DASHBOARD_AGENT_ID,
        attachments: [dashboardAttachment],
      });

      return () => {
        agentBuilderService?.clearConversationFlyoutActiveConfig();
      };
    },
    [dashboardApi, savedDashboardId]
  );
}
