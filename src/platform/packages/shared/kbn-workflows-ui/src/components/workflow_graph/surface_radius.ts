/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Corner radius for floating chrome over the workflow canvas (config panel,
 * bottom bar, zoom controls, minimap). Matches the upcoming EUI visual-refresh
 * `border.radius.panel` (~12px). Swap to `euiTheme.border.radius.panel` when
 * Kibana upgrades past EUI 122.0.
 */
export const WORKFLOWS_SURFACE_RADIUS = 12;

/**
 * Inset from the canvas edge for floating chrome (zoom, minimap, bottom bar,
 * settings launcher / config panels).
 */
export const WORKFLOWS_CANVAS_CHROME_INSET = 16;
