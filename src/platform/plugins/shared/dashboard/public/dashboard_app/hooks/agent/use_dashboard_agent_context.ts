/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { filter, combineLatest, debounceTime, distinctUntilChanged, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import deepEqual from 'fast-deep-equal';
import { isToolUiEvent } from '@kbn/agent-builder-common/chat';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_AGENT_ID,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type PanelAddedEventData,
  type DashboardUiEvent,
} from '@kbn/dashboard-agent-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import type { DashboardApi } from '../../../dashboard_api/types';
import { agentBuilderService, dataService } from '../../../services/kibana_services';
import { getDashboardAttachmentService } from '../../../services/dashboard_attachment_service';
import { extractPanelsAndSections } from './panel_attachment_utils';

/**
 * Hook that integrates the dashboard app with the agent builder system.
 *
 * This hook:
 * 1. Sets up the conversation flyout with the current dashboard context
 * 2. Listens for dashboard:panel_added and dashboard:panel_removed UI events
 * 3. Applies those events to the dashboard API in real-time
 * 4. Persists attachment IDs across page refreshes and browser sessions
 */
export function useDashboardAgentContext({
  dashboardApi,
  urlAttachmentId,
}: {
  dashboardApi: DashboardApi | undefined;
  /** Attachment ID from URL query parameter (agent navigation) */
  urlAttachmentId?: string;
}) {
  // Subscribe to savedObjectId changes
  const savedObjectId$ = useMemo(
    () => dashboardApi?.savedObjectId$ ?? of(undefined),
    [dashboardApi]
  );
  const savedObjectId = useObservable(savedObjectId$, undefined);

  // Resolve the attachment ID using the attachment service
  const sessionAttachmentId = useMemo(() => {
    const attachmentService = getDashboardAttachmentService();
    return attachmentService.getAttachmentId(savedObjectId, urlAttachmentId);
  }, [savedObjectId, urlAttachmentId]);

  // Effect to set up conversation flyout config with dashboard context
  useEffect(
    function setupDashboardAttachment() {
      if (!agentBuilderService || !dashboardApi) {
        return;
      }

      const agentBuilder = agentBuilderService;

      // Subscribe to dashboard state changes to update the attachment
      const stateSubscription = combineLatest([
        dashboardApi.title$,
        dashboardApi.description$,
        dashboardApi.savedObjectId$,
        dashboardApi.children$,
      ])
        .pipe(debounceTime(300), distinctUntilChanged(deepEqual))
        .subscribe(([title, description, currentSavedObjectId]) => {
          const { attributes } = dashboardApi.getSerializedState();
          const { panels: extractedPanels, sections } = extractPanelsAndSections(
            attributes.panels,
            dashboardApi
          );

          const dashboardAttachment: AttachmentInput = {
            id: sessionAttachmentId,
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: {
              title: title ?? 'Untitled Dashboard',
              description: description ?? '',
              savedObjectId: currentSavedObjectId,
              panels: extractedPanels,
              sections,
            },
          };

          agentBuilder.setConversationFlyoutActiveConfig({
            sessionTag: 'dashboard',
            agentId: DASHBOARD_AGENT_ID,
            attachments: [dashboardAttachment],
          });
        });

      return () => {
        stateSubscription.unsubscribe();
        agentBuilder.clearConversationFlyoutActiveConfig();
      };
    },
    [dashboardApi, sessionAttachmentId]
  );

  // Effect to handle UI events from the agent builder
  useEffect(
    function handleDashboardUiEvents() {
      if (!agentBuilderService || !dashboardApi) {
        return;
      }

      const { events } = agentBuilderService;

      const subscription = events.chat$
        .pipe(
          filter(
            (event): event is DashboardUiEvent =>
              isToolUiEvent(event, DASHBOARD_PANEL_ADDED_EVENT) ||
              isToolUiEvent(event, DASHBOARD_PANEL_REMOVED_EVENT)
          )
        )
        .subscribe(async (event) => {
          const { custom_event: eventType, data } = event.data;

          // Guard: only apply events for our dashboard attachment
          if (data.dashboardAttachmentId !== sessionAttachmentId) {
            return;
          }

          // TODO: Handle DASHBOARD_PANEL_REMOVED_EVENT
          if (eventType !== DASHBOARD_PANEL_ADDED_EVENT) {
            return;
          }

          const panelData = data as PanelAddedEventData;
          const { panel } = panelData;

          if (panel.type !== LENS_EMBEDDABLE_TYPE || !panel.visualization) {
            return;
          }

          try {
            const configBuilder = new LensConfigBuilder(dataService.dataViews);
            const lensConfig = panel.visualization as LensApiSchemaType;

            const lensAttributes = configBuilder.fromAPIFormat(lensConfig);
            const panelTitle = lensAttributes.title ?? panel.title ?? 'Generated panel';

            await dashboardApi.addNewPanel({
              panelType: LENS_EMBEDDABLE_TYPE,
              maybePanelId: panel.panelId,
              serializedState: {
                attributes: lensAttributes,
                title: panelTitle,
              },
            });
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to add panel from agent builder:', error);
          }
        });

      return () => {
        subscription.unsubscribe();
      };
    },
    [dashboardApi, sessionAttachmentId]
  );
}
