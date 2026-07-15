/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEventHandler, ReactNode } from 'react';
import type { IconType, CommonProps } from '@elastic/eui';

/**
 * Extension properties that add-panel actions can declare to customize how
 * the dashboard renders them in the add-panel flyout and empty screen.
 */
export interface AddPanelActionExtension {
  /**
   * When true, the menu item is rendered with the assistance (AI) visual treatment.
   */
  isHighlighted?: boolean;
}

export interface MenuItem extends Pick<CommonProps, 'data-test-subj'> {
  id: string;
  name: string;
  icon: IconType;
  onClick: MouseEventHandler;
  description?: string;
  isDisabled?: boolean;
  isDeprecated?: boolean;
  isHighlighted?: boolean;
  order: number;
  MenuItem?: ReactNode;
}

export interface MenuItemGroup extends Pick<CommonProps, 'data-test-subj'> {
  id: string;
  isDisabled?: boolean;
  title: string;
  order: number;
  items: MenuItem[];
}
