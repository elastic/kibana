/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { apiHasAppContext, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';

import { ADD_PANEL_LEGACY_GROUP } from '@kbn/embeddable-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import { TSVB_ICON, TSVB_DESCRIPTION, TSVB_TITLE } from './metrics_type';

export const CREATE_TSVB_PANEL = 'CREATE_TSVB_PANEL';

/**
 * Factory that creates the action definition used to add a new Time Series Visual Builder (TSVB)
 * panel from within an embeddable container (e.g. a dashboard). The returned action integrates
 * with the embeddable infrastructure and leverages the state transfer service to open the
 * Visualize editor pre-seeded for creating a TSVB visualization.
 *
 * Behavior:
 * - Always compatible (no preconditions).
 * - Navigates to the Visualize editor with:
 *   - A metrics visualization type (`#/create?type=metrics`).
 *   - Originating app id and path (when available) for proper back navigation.
 *   - The current search session id to preserve query context.
 *
 * Icon, display name, and tooltip are sourced from TSVB-specific constants to keep
 * presentation concerns centralized.
 *
 * @remarks
 * The action purposefully does not perform capability checks itself; external registries
 * may wrap or filter it based on user privileges. The `apiHasAppContext` guard ensures
 * safe extraction of app-related navigation state when the embeddable supplies that context.
 *
 * @public
 */
export const addTSVBPanelAction = (deps: {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
}): ActionDefinition<EmbeddableApiContext> => ({
  id: CREATE_TSVB_PANEL,
  grouping: [ADD_PANEL_LEGACY_GROUP],
  order: 30,
  getIconType: () => TSVB_ICON,
  isCompatible: async ({ embeddable }) => apiIsPresentationContainer(embeddable),
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    const stateTransferService = deps.embeddable.getStateTransfer();
    stateTransferService.navigateToEditor('visualize', {
      path: '#/create?type=metrics',
      state: {
        originatingApp: apiHasAppContext(embeddable) ? embeddable.getAppContext().currentAppId : '',
        originatingPath: apiHasAppContext(embeddable)
          ? embeddable.getAppContext().getCurrentPath?.()
          : undefined,
        searchSessionId: deps.data.search.session.getSessionId(),
      },
    });
  },
  getDisplayName: () => TSVB_TITLE,
  getDisplayNameTooltip: () => TSVB_DESCRIPTION,
});
