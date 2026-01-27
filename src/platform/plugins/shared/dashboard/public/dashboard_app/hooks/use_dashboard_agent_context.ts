/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { filter, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { isToolUiEvent } from '@kbn/agent-builder-common/chat';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import { apiHasLibraryTransforms } from '@kbn/presentation-publishing';
import {
  isLensAPIFormat,
  isLensLegacyAttributes,
} from '@kbn/lens-embeddable-utils/config_builder/utils';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_AGENT_ID,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type PanelAddedEventData,
  type DashboardUiEvent,
  type AttachmentPanel,
} from '@kbn/dashboard-agent-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { isDashboardSection, type DashboardState } from '../../../common';
import type { DashboardApi } from '../../dashboard_api/types';
import { agentBuilderService, dataService } from '../../services/kibana_services';

const lensConfigBuilder = new LensConfigBuilder(undefined, true);

/**
 * Converts a panel's raw state to an AttachmentPanel format.
 *
 * For Lens panels with supported chart types:
 *   - If already in API format (LensApiSchemaType), use directly as 'lens' type
 *   - If in LensAttributes format, convert to API format using lensConfigBuilder
 *   - If conversion fails or chart type unsupported, fall back to generic panel
 *
 * For all other panels:
 *   - Returns generic panel with actual embeddable type and rawConfig for passthrough
 *
 * @param panelId - The panel ID
 * @param embeddableType - The embeddable type (e.g., 'lens', 'aiOpsLogRateAnalysis')
 * @param rawState - The raw state from the panel
 * @param title - Optional panel title
 * @returns LensAttachmentPanel or GenericAttachmentPanel
 */
function convertToAttachmentPanel(
  panelId: string,
  embeddableType: string,
  rawState: Record<string, unknown>,
  title?: string
): AttachmentPanel {
  // Non-lens panels
  if (embeddableType !== LENS_EMBEDDABLE_TYPE) {
    return {
      type: embeddableType,
      panelId,
      rawConfig: rawState,
      title,
    };
  }

  try {
    // Check for internal LensAttributes format first.
    // This must be checked BEFORE isLensAPIFormat because LensAttributes can also have a 'type'
    // property (e.g., type: 'lens') which would incorrectly match isLensAPIFormat.

    if (isLensLegacyAttributes(rawState)) {
      const lensAttributes = rawState;
      const visType = lensAttributes.visualizationType;

      // Check if we can convert this chart type to API format
      if (!visType || !lensConfigBuilder.isSupported(visType)) {
        // Unsupported Lens chart type - return as generic 'lens' panel with rawConfig
        return {
          type: embeddableType,
          panelId,
          rawConfig: rawState,
          title: title ?? lensAttributes.title,
        };
      }

      // Convert from LensAttributes (internal) to LensApiSchemaType (API format)
      const apiConfig = lensConfigBuilder.toAPIFormat(lensAttributes);

      return {
        type: embeddableType,
        panelId,
        visualization: apiConfig,
        title: apiConfig.title ?? title,
      };
    }

    // Check if already in API format (has 'type' property with chart type like 'xy', 'metric', etc.)
    if (isLensAPIFormat(rawState)) {
      return {
        type: embeddableType,
        panelId,
        visualization: rawState,
        title: (rawState.title as string) ?? title,
      };
    }

    // Unknown format - return as generic panel with rawConfig
    return {
      type: embeddableType,
      panelId,
      rawConfig: rawState,
      title,
    };
  } catch (error) {
    // If conversion fails, return as generic 'lens' panel with rawConfig

    return {
      type: embeddableType,
      panelId,
      rawConfig: rawState,
      title,
    };
  }
}

/**
 * Extracts the raw state from a panel, handling both by-reference and by-value panels.
 *
 * For Lens panels: returns `attributes` which contains LensAttributes
 * For other panels: returns the full serialized state as rawConfig
 *
 * Note: Serialized state structure varies by embeddable type. We use runtime checks
 * since there's no universal type for all embeddable serialization formats.
 */
function extractRawState(
  childApi: unknown,
  dashboardApi: DashboardApi,
  panelId: string,
  embeddableType: string
): { rawState: Record<string, unknown>; title?: string } | null {
  try {
    let serialized: Record<string, unknown>;

    if (apiHasLibraryTransforms(childApi)) {
      // For by-reference panels, use getSerializedStateByValue to get full content
      serialized = childApi.getSerializedStateByValue() as Record<string, unknown>;
    } else {
      // For by-value panels, use the regular serialized state
      const fullPanelData = dashboardApi.getDashboardPanelFromId(panelId);
      serialized = fullPanelData.serializedState as Record<string, unknown>;
    }

    const title = typeof serialized.title === 'string' ? serialized.title : undefined;

    // For Lens panels, the attributes field contains LensAttributes
    if (
      embeddableType === LENS_EMBEDDABLE_TYPE &&
      serialized.attributes &&
      typeof serialized.attributes === 'object'
    ) {
      const attributes = serialized.attributes as Record<string, unknown>;
      return {
        rawState: attributes,
        title: title ?? (typeof attributes.title === 'string' ? attributes.title : undefined),
      };
    }

    // For other panels, check for rawState first, then use the full serialized state
    if (serialized.rawState && typeof serialized.rawState === 'object') {
      return { rawState: serialized.rawState as Record<string, unknown>, title };
    }

    // Fallback: use the entire serialized state as rawConfig
    return { rawState: serialized, title };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to extract raw state for panel ${panelId}:`, error);
    return null;
  }
}

/**
 * Resolves a panel definition to an AttachmentPanel by extracting its state.
 * Returns null if the panel is not yet available in children$ or extraction fails.
 */
function resolvePanelToAttachment(
  panel: { uid?: string; type: string },
  children: Record<string, unknown>,
  dashboardApi: DashboardApi
): AttachmentPanel | null {
  const panelId = panel.uid;

  if (!panelId || !children[panelId]) {
    return null;
  }

  const extracted = extractRawState(children[panelId], dashboardApi, panelId, panel.type);
  if (!extracted) {
    return null;
  }

  return convertToAttachmentPanel(panelId, panel.type, extracted.rawState, extracted.title);
}

function extractPanelsAndSections(
  panels: DashboardState['panels'],
  dashboardApi: DashboardApi
): {
  panels: AttachmentPanel[];
  sections: Array<{ title: string; panels: AttachmentPanel[] }>;
} {
  if (!panels || panels.length === 0) {
    return { panels: [], sections: [] };
  }

  const children = dashboardApi.children$.value;
  const topLevelPanels: AttachmentPanel[] = [];
  const sections: Array<{ title: string; panels: AttachmentPanel[] }> = [];

  for (const item of panels) {
    if (isDashboardSection(item)) {
      const resolvedPanels = (item.panels ?? [])
        .map((panel) => resolvePanelToAttachment(panel, children, dashboardApi))
        .filter((panel): panel is AttachmentPanel => panel !== null);

      sections.push({
        title: item.title,
        panels: resolvedPanels,
      });
    } else {
      const resolved = resolvePanelToAttachment(item, children, dashboardApi);
      if (resolved) {
        topLevelPanels.push(resolved);
      }
    }
  }

  return { panels: topLevelPanels, sections };
}

/**
 * Hook that integrates the dashboard app with the agent builder system.
 *
 * This hook:
 * 1. Sets up the conversation flyout with the current dashboard context
 * 2. Listens for dashboard:panel_added and dashboard:panel_removed UI events
 * 3. Applies those events to the dashboard API in real-time
 */
export function useDashboardAgentContext({
  dashboardApi,
  dashboardAttachmentId,
}: {
  dashboardApi: DashboardApi | undefined;
  dashboardAttachmentId?: string;
}) {
  // Generate a stable attachment ID for this dashboard session
  const sessionAttachmentId = useMemo(() => {
    return dashboardAttachmentId ?? `dashboard-${Date.now()}`;
  }, [dashboardAttachmentId]);

  // Effect to set up conversation flyout config with dashboard context
  useEffect(
    function setupDashboardAttachment() {
      if (!agentBuilderService || !dashboardApi) {
        return;
      }

      // Capture the service reference for use in callbacks
      const agentBuilder = agentBuilderService;

      // Subscribe to dashboard state changes to update the attachment
      // When children$ changes, we extract full panel configs in API format
      const stateSubscription = combineLatest([
        dashboardApi.title$,
        dashboardApi.description$,
        dashboardApi.savedObjectId$,
        dashboardApi.children$,
      ])
        .pipe(debounceTime(300), distinctUntilChanged(deepEqual))
        .subscribe(([title, description, savedObjectId]) => {
          const { attributes } = dashboardApi.getSerializedState();
          const { panels: extractedPanels, sections } = extractPanelsAndSections(
            attributes.panels,
            dashboardApi
          );

          // Create dashboard attachment with full panel configs
          const dashboardAttachment: AttachmentInput = {
            id: sessionAttachmentId,
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: {
              title: title ?? 'Untitled Dashboard',
              description: description ?? '',
              savedObjectId,
              panels: extractedPanels,
              sections,
            },
          };

          // Set the conversation flyout config with dashboard context
          agentBuilder.setConversationFlyoutActiveConfig({
            sessionTag: 'dashboard',
            agentId: DASHBOARD_AGENT_ID,
            attachments: [dashboardAttachment],
          });
        });

      return () => {
        stateSubscription.unsubscribe();
        // Clear the flyout config when leaving the dashboard
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

      // Subscribe to chat events and filter for dashboard UI events
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
          if (sessionAttachmentId && data.dashboardAttachmentId !== sessionAttachmentId) {
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

            // fromAPIFormat converts the API schema to LensAttributes
            const lensAttributes = configBuilder.fromAPIFormat(lensConfig);
            const panelTitle = lensAttributes.title ?? panel.title ?? 'Generated panel';

            // Add the panel to the dashboard with the correct serialized state format
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
