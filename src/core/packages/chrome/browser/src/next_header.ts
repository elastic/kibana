/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

import type { AppMenuConfigNext } from '@kbn/core-chrome-app-menu-components';

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
   * Optional badges displayed inline next to the title.
   * Overflow rules (enforced by Chrome rendering):
   * - 1–2 badges: show all.
   * - 3+: show the first badge plus a "+N" overflow control that opens a popover with the rest.
   * Guidance: prefer 1–2 badges; 3+ is for uncontrolled cases (e.g. user-applied tags).
   * Badge max width: 200px (truncated text).
   * The `filled` color variant is not exposed to avoid competing primary CTAs.
   *
   * TODO: Wire rendering in `ProjectNextHeader`.
   */
  badges?: ChromeNextHeaderBadge[];

  /**
   * Optional metadata row below the title (second row).
   * At most 3 items; no overflow — all are visible.
   * Items are plain text (`EuiText`) or interactive (`EuiButtonEmpty`).
   *
   * TODO: Wire rendering in `ProjectNextHeader`.
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
   * TODO: Consider strict type independent from `@kbn/core-chrome-app-menu-components`
   */
  appMenu?: AppMenuConfigNext;

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

export interface ChromeNextHeaderBadge {
  label: string;
  /** EUI badge color. `filled` is intentionally excluded. */
  color?: 'hollow' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  tooltip?: string;
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
   * Edit title: Chrome will own the pencil control and inline editor; apps handle persistence.
   * TODO: Wire UI — `onSave` is reserved for when inline editing is implemented.
   */
  editTitle?: {
    /** Called when Chrome's inline editor commits a new title. */
    onSave: (newTitle: string) => void;
    // TODO: onCancel, validation, maxLength when inline editing ships.
  };
  /** Share action. Chrome renders a share icon. */
  share?: {
    onClick: () => void;
    // TODO: disabled, tooltipContent when polish pass.
  };
  /**
   * Favorite control supplied by the app (e.g. `FavoriteButton` with providers).
   * Chrome reserves layout only; fixed order after share. A handler-only API is insufficient
   * because favorites need app-owned clients, context, and React Query wiring.
   */
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
