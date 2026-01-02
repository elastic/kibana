/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  dashboardAttachments,
  DASHBOARD_AGENT_ID,
  type PanelSummary,
} from '@kbn/dashboard-agent-plugin/common';
import type { DashboardApi } from '../../dashboard_api/types';
import { agentBuilderService } from '../../services/kibana_services';
import { isDashboardSection, type DashboardState } from '../../../common';

/**
 * Extracts panel summaries from the serialized dashboard state
 */
function getPanelSummariesFromState(panels: DashboardState['panels']): PanelSummary[] | undefined {
  if (!panels || panels.length === 0) {
    return undefined;
  }

  const summaries: PanelSummary[] = [];

  for (const item of panels) {
    if (isDashboardSection(item)) {
      // It's a section - extract panels from within the section
      if (item.panels) {
        for (const panel of item.panels) {
          summaries.push({
            type: panel.type,
            title: (panel.config as { title?: string })?.title,
          });
        }
      }
    } else {
      // It's a regular panel
      summaries.push({
        type: item.type,
        title: (item.config as { title?: string })?.title,
      });
    }
  }

  return summaries.length > 0 ? summaries : undefined;
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
  const [title, setTitle] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();

  useEffect(
    function subscribeToTitleAndDescription() {
      if (!dashboardApi) return;

      const titleSubscription = dashboardApi.title$.subscribe(setTitle);
      const descriptionSubscription = dashboardApi.description$.subscribe(setDescription);

      return () => {
        titleSubscription.unsubscribe();
        descriptionSubscription.unsubscribe();
      };
    },
    [dashboardApi]
  );

  useEffect(
    function setDashboardAttachment() {
      if (!agentBuilderService || !dashboardApi || !savedDashboardId) {
        return;
      }

      const dashboardTitle = title || 'Untitled Dashboard';

      const { attributes } = dashboardApi.getSerializedState();
      const panelCount = dashboardApi.getPanelCount();
      const panelSummaries = getPanelSummariesFromState(attributes.panels);

      const attachmentData = {
        dashboardId: savedDashboardId,
        title: dashboardTitle,
        description: description || undefined,
        panelCount,
        panels: panelSummaries,
      };

      const dashboardAttachment: AttachmentInput = {
        id: `dashboard-${savedDashboardId}`,
        type: dashboardAttachments.dashboard,
        data: attachmentData,
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
    [dashboardApi, savedDashboardId, title, description]
  );
}
