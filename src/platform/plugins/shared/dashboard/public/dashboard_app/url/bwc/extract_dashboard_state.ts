/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardCreationOptions } from '../../../dashboard_api/types';
import { extractControlGroupState } from './extract_control_group_state';
import { extractOptions } from './extract_options';
import { extractPanelsState } from './extract_panels_state';
import { extractSearchState } from './extract_search_state';

export function extractDashboardState(
  state?: unknown
): ReturnType<NonNullable<DashboardCreationOptions['getInitialInput']>> {
  let dashboardState: ReturnType<NonNullable<DashboardCreationOptions['getInitialInput']>> = {};
  if (state && typeof state === 'object') {
    const stateAsObject = state as { [key: string]: unknown };

    const { pinned_panels, autoApplyFilters } = extractControlGroupState(stateAsObject);

    if (pinned_panels) dashboardState.pinned_panels = pinned_panels;
    if (
      dashboardState.options?.auto_apply_filters === undefined &&
      typeof autoApplyFilters === 'boolean'
    ) {
      // >9.4 the `autoApplySelections` control group setting became the `autoApplyFilters` dashboard setting
      dashboardState.options = { ...dashboardState.options, auto_apply_filters: autoApplyFilters };
    }

    if (typeof stateAsObject.description === 'string') {
      dashboardState.description = stateAsObject.description;
    }

    if (Array.isArray(stateAsObject.tags)) {
      dashboardState.tags = stateAsObject.tags;
    }

    if (typeof stateAsObject.title === 'string') {
      dashboardState.title = stateAsObject.title;
    }

    if (Array.isArray(stateAsObject.references))
      dashboardState.references = stateAsObject.references;

    if (typeof stateAsObject.viewMode === 'string')
      dashboardState.viewMode = stateAsObject.viewMode as ViewMode;

    const options = extractOptions(stateAsObject);

    dashboardState = {
      ...dashboardState,
      ...extractSearchState(stateAsObject),
      ...(Object.keys(options).length && { options }),
    };

    const { panels, savedObjectReferences } = extractPanelsState(stateAsObject);
    if (panels?.length) dashboardState.panels = panels;
    if (savedObjectReferences?.length) {
      dashboardState.references = [...(dashboardState.references ?? []), ...savedObjectReferences];
    }
  }

  return dashboardState;
}
