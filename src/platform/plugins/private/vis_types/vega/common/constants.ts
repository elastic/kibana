/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Frozen as part of the Dashboard REST API (`panels[].type`). */
export const VEGA_EMBEDDABLE_TYPE = 'vega';

/** Event name emitted by Vega specs when a filter should be applied to the host application. */
export const VEGA_EVENT_APPLY_FILTER = 'applyFilter';

/** Browser feature flag gating the Dashboard "Add Vega panel" creation action. Off by default. */
export const VEGA_DASHBOARD_EMBEDDABLE_FLAG = 'vega.dashboardEmbeddable';

export const ADD_VEGA_EMBEDDABLE_ACTION_ID = 'addVegaEmbeddableAction';

/** Legacy "Add Vega" action that navigates to the Visualize editor (Canvas + flag-off Dashboard). */
export const ADD_VEGA_PANEL_ACTION_ID = 'addVegaPanelAction';
