/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { isDashboardSection } from '../../../common/is_dashboard_section';
import { coreServices } from '../../services/kibana_services';
import { DASHBOARD_SAVED_EVENT } from '../../utils/telemetry_constants';

export interface DashboardSavedEvent {
  is_new: boolean;
  is_copy: boolean;
  change_sources?: string[];
  panel_count: number;
  panel_types: string[];
}

export const dashboardSavedEventSchema: RootSchema<DashboardSavedEvent> = {
  is_new: {
    type: 'boolean',
    _meta: { description: 'Whether the save created a new dashboard saved object' },
  },
  is_copy: {
    type: 'boolean',
    _meta: { description: 'Whether the new dashboard was saved as a copy of an existing one' },
  },
  change_sources: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'An integration that changed the dashboard since its last save' },
    },
    _meta: {
      description: 'Integrations that changed the dashboard since its last save',
      optional: true,
    },
  },
  panel_count: {
    type: 'integer',
    _meta: { description: 'Number of panels in the saved dashboard, including panels in sections' },
  },
  panel_types: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'The type of one panel' },
    },
    _meta: { description: 'One entry per panel, so duplicates count panels of the same type' },
  },
};

const getPanelTypes = (panels: DashboardState['panels']): string[] =>
  panels.flatMap((widget) =>
    isDashboardSection(widget) ? widget.panels.map(({ type }) => type) : [widget.type]
  );

export const reportDashboardSaved = ({
  previousDashboardId,
  dashboardId,
  dashboardState,
  changeSources,
}: {
  previousDashboardId?: string;
  dashboardId?: string;
  dashboardState: DashboardState;
  changeSources: readonly string[];
}): void => {
  const isNew = previousDashboardId !== dashboardId;
  const panelTypes = getPanelTypes(dashboardState.panels);
  coreServices.analytics.reportEvent<DashboardSavedEvent>(DASHBOARD_SAVED_EVENT, {
    is_new: isNew,
    is_copy: isNew && previousDashboardId !== undefined,
    ...(changeSources.length > 0 && { change_sources: [...changeSources] }),
    panel_count: panelTypes.length,
    panel_types: panelTypes,
  });
};
