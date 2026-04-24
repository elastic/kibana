/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ReactNode } from 'react';
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
  title?: string;

  /**
   * Badges inline next to the title. Chrome shows 1–2 as-is; for 3+, first badge plus "+N" popover
   * for the rest. Max 200px per badge; `filled` is not exposed.
   */
  badges?: ChromeNextHeaderBadge[];

  /**
   * Second row below the title (max 3 items, all visible). Text (`EuiText`) or button (`EuiButtonEmpty`).
   * TODO: render in `AppHeader`.
   */
  metadata?: ChromeNextHeaderMetadataSlotItem[];

  /**
   * Global object actions next to the title. Edit title and share use fixed Chrome icons;
   * favorite is an optional app-supplied `ReactNode` (e.g. content-management FavoriteButton).
   *
   * Rendering order (fixed by Chrome): editTitle, share, favorite.
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
   * When set, overrides breadcrumb-derived back destinations.
   * A single object produces a direct link; an array produces a popover menu.
   */
  back?: ChromeNextHeaderBack | ChromeNextHeaderBack[];
}

/** Explicit back target for {@link ChromeNextHeaderConfig.back}. */
export interface ChromeNextHeaderBack {
  href: string;
  /** Destination name for accessibility (e.g. "Back to {label}"). */
  label?: string;
}

export interface ChromeNextHeaderBadge {
  label: string;
  /** EUI badge color. `filled` is intentionally excluded. */
  color?: 'hollow' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  tooltip?: string;
  onClick?: () => void;
  onClickAriaLabel?: string;
  'data-test-subj'?: string;
}

/**
 * A single metadata slot item — either plain text or an interactive button.
 * Text renders as `EuiText`; button renders as `EuiButtonEmpty`.
 */
export type ChromeNextHeaderMetadataSlotItem =
  | { type: 'text'; label: string }
  | { type: 'button'; label: string; onClick: () => void; iconType?: string };

/**
 * Global actions beside the Chrome-Next title.
 */
export interface ChromeNextHeaderGlobalActions {
  /**
   * Inline title edit (Chrome UI TBD). `onSave` runs when the user commits a new title.
   */
  editTitle?: {
    onSave: (newTitle: string) => void;
  };
  /** Share; Chrome renders the icon. */
  share?: {
    onClick: () => void;
  };
  /** Favorite control as `ReactNode` (e.g. FavoriteButton) so apps supply providers and clients. */
  /** TODO: should become a structured API */
  favorite?: ReactNode;
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
