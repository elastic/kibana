/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const METRICS_INFO_EVENT_TYPE = 'discover_metrics_info';

/**
 * EBT event type for non-render errors reported by the metrics grid
 * (e.g. fetch failures, Lens attribute build failures). Distinct from the
 * shared-ux `fatal-error-react` schema, which is render-boundary-specific.
 */
export const METRICS_GRID_NON_RENDER_ERROR_EVENT_TYPE = 'metrics_grid_non_render_error';
