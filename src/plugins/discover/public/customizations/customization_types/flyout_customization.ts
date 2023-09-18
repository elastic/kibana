/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface FlyoutDefaultActionItem {
  disabled?: boolean;
  order?: number;
}

export interface FlyoutDefaultActions {
  viewSingleDocument?: FlyoutDefaultActionItem;
  viewSurroundingDocument?: FlyoutDefaultActionItem;
}

export interface FlyoutActionItem {
  content: React.ReactNode;
  disabled: boolean;
}

export interface FlyoutCustomization {
  id: 'flyout';
  actions: {
    defaultActions?: FlyoutDefaultActions;
    getActionItems?: () => FlyoutActionItem[];
  };
}
