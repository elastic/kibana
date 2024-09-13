/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Trigger } from '@kbn/ui-actions-plugin/public';

export const VISUALIZE_EDITOR_TRIGGER = 'VISUALIZE_EDITOR_TRIGGER';
export const visualizeEditorTrigger: Trigger = {
  id: VISUALIZE_EDITOR_TRIGGER,
  title: 'Convert TSVB to Lens',
  description: 'Triggered when user navigates from a TSVB to Lens.',
};

export const AGG_BASED_VISUALIZATION_TRIGGER = 'AGG_BASED_VISUALIZATION_TRIGGER';
export const aggBasedVisualizationTrigger: Trigger = {
  id: AGG_BASED_VISUALIZATION_TRIGGER,
  title: 'Convert legacy agg based visualizations to Lens',
  description: 'Triggered when user navigates from a agg based visualization to Lens.',
};

export const DASHBOARD_VISUALIZATION_PANEL_TRIGGER = 'DASHBOARD_VISUALIZATION_PANEL_TRIGGER';
export const dashboardVisualizationPanelTrigger: Trigger = {
  id: DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
  title: 'Convert legacy visualization panel on dashboard to Lens',
  description: 'Triggered when user use "Edit in Lens" action on dashboard panel',
};

export const ACTION_CONVERT_TO_LENS = 'ACTION_CONVERT_TO_LENS';
export const ACTION_CONVERT_AGG_BASED_TO_LENS = 'ACTION_CONVERT_AGG_BASED_TO_LENS';
export const ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS = 'ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS';
