/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

/**
 * Unified configuration for the Chrome-controlled Chrome-Next header.
 * Apps provide structured data via `chrome.next.header.set(config)`;
 * Chrome renders title area, global actions, and app menu.
 */
export interface ChromeNextHeaderConfig {
  /**
   * Page title displayed in the Chrome-controlled header.
   * Can be the app name (e.g. "Discover") or a viewed object
   * (e.g. a saved dashboard name). Single-line, truncated by Chrome if too long.
   */
  title: string;

  /**
   * Optional metadata badges/text rendered below the title.
   * E.g. "Managed", "Read-only", creation date, severity.
   * Limited to a single row; Chrome controls layout.
   */
  metadata?: ChromeNextHeaderMetadataItem[];

  /**
   * Global object actions whose icon, label, and position are fixed by Chrome.
   * Apps opt-in by providing handlers; they cannot change icon or order.
   *
   * Rendering order (fixed by Chrome): edit, share, favorite.
   */
  globalActions?: ChromeNextHeaderGlobalActions;

  /**
   * Optional tabs rendered as part of the header.
   * When provided, increases the top bar height dynamically.
   */
  tabs?: ChromeNextHeaderTab[];

  /**
   * Optional single callout rendered below the title/tabs area.
   * Only one callout at a time. Chrome controls styling.
   */
  callout?: ChromeNextHeaderCallout;

  /**
   * App menu (toolbar actions). Items, primary action, secondary action.
   */
  appMenu?: AppMenuConfig;

  /**
   * Optional explicit back navigation for the Chrome-Next header back control.
   * When `href` is set, overrides breadcrumb-derived back destination.
   */
  back?: ChromeNextHeaderBack;
}

/** Explicit back target for {@link ChromeNextHeaderConfig.back}. */
export interface ChromeNextHeaderBack {
  href: string;
  /** Destination name for accessibility (e.g. "Back to {label}"). */
  label?: string;
}

export interface ChromeNextHeaderMetadataItem {
  label: string;
  type: 'badge' | 'text';
  /** Badge color (EUI badge color). Only used when type is 'badge'. */
  color?: string;
  tooltip?: string;
}

/**
 * Global actions whose icon, label, and position are fixed by Chrome.
 * Apps provide only the behavioral handlers.
 */
export interface ChromeNextHeaderGlobalActions {
  /** Edit action. Chrome renders a pencil icon next to the title. */
  edit?: {
    onClick: () => void;
  };
  /** Share action. Chrome renders a share icon. */
  share?: {
    onClick: () => void;
  };
  /** Favorite/star action. Chrome renders a star icon. */
  favorite?: {
    isFavorited: boolean;
    onClick: () => void;
  };
}

export interface ChromeNextHeaderTab {
  id: string;
  label: string;
  isSelected?: boolean;
  onClick: () => void;
  /** Optional badge count on the tab */
  badge?: number;
}

export interface ChromeNextHeaderCallout {
  title: string;
  color: 'primary' | 'warning' | 'danger' | 'success';
  text?: string;
  /** When provided, renders a dismiss button */
  onDismiss?: () => void;
}
