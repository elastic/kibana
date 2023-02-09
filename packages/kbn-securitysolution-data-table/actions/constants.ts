/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum SecurityCellActionsTrigger {
  DEFAULT = 'security-default-cellActions',
  DETAILS_FLYOUT = 'security-detailsFlyout-cellActions',
}

export enum SecurityCellActionType {
  FILTER = 'security-cellAction-type-filter',
  COPY = 'security-cellAction-type-copyToClipboard',
  ADD_TO_TIMELINE = 'security-cellAction-type-addToTimeline',
  SHOW_TOP_N = 'security-cellAction-type-showTopN',
  TOGGLE_COLUMN = 'security-cellAction-type-toggleColumn',
}
