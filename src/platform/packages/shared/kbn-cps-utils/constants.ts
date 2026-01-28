/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Project routing constants for Cross-project search
 * These are stored as strings in saved objects to explicitly override parent values
 */
export const PROJECT_ROUTING = {
  /** Search across all linked projects */
  ALL: '_alias:*',
  /** Search only the origin project */
  ORIGIN: '_alias:_origin',
} as const;

export type ProjectRoutingValue = (typeof PROJECT_ROUTING)[keyof typeof PROJECT_ROUTING];
