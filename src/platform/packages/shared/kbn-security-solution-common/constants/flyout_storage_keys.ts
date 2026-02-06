/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Storage keys shared between Security Solution and Discover for the document
 * details flyout (e.g. overview tab expanded sections).
 */
export const FLYOUT_STORAGE_KEYS = {
  OVERVIEW_TAB_EXPANDED_SECTIONS:
    'securitySolution.documentDetailsFlyout.overviewSectionExpanded.v8.14',
} as const;
