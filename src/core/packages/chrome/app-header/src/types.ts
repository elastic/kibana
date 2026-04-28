/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type React from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

export type AppHeaderMenu = AppMenuConfig;

/** Explicit back target for the app header back control. */
export interface AppHeaderBack {
  href: string;
  /** Click handler, called alongside href navigation when provided. */
  onClick?: React.MouseEventHandler;
  /** Destination name for accessibility (e.g. "Back to {label}"). */
  label?: string;
}

export interface AppHeaderBadge {
  label: string;
  /** EUI badge color. `filled` is intentionally excluded. */
  color?: 'hollow' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  tooltip?: string;
  onClick?: () => void;
  onClickAriaLabel?: string;
  'data-test-subj'?: string;
}

export interface AppHeaderTab {
  id: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number;
  'data-test-subj'?: string;
}

export type AppHeaderPadding =
  | 'none'
  | 'm'
  | {
      bleed: 'm' | 'l';
      size?: 'none' | 'm' | 'l';
    };
