/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Breakpoints where AppMenu renders the enabled switch outside the overflow menu.
 * Keep aligned with `AppMenuComponent` (`m`/`l` inline switch + overflow items, `xl` fully inline).
 */
export const WORKFLOW_DETAIL_INLINE_TOOLBAR_BREAKPOINTS = ['m', 'l', 'xl'] as const;
