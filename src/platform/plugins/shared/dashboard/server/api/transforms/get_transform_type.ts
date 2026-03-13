/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Embeddable types that register separate as-code transforms for the REST API
// and legacy transforms for the Dashboard app. The Dashboard app route uses
// `${type}-dashboard-app` to resolve the legacy transforms.
// TODO: Remove when all as-code transforms are production-ready.
const AS_CODE_TRANSFORM_TYPES = ['lens', 'search'];

export function getTransformType(panelType: string, isDashboardAppRequest: boolean): string {
  if (AS_CODE_TRANSFORM_TYPES.includes(panelType) && isDashboardAppRequest) {
    return `${panelType}-dashboard-app`;
  }
  return panelType;
}
