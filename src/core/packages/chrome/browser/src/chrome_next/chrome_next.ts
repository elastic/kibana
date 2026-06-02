/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode, MouseEventHandler } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { GlobalSearchConfig } from './global_search';

/** @public */
export type AppHeaderBack = string | AppHeaderBackTarget;

/** @public */
export interface AppHeaderBackTarget {
  href: string;
  /** Click handler, called alongside href navigation when provided. */
  onClick?: MouseEventHandler;
  /** Destination name for accessibility (e.g. "Back to {label}"). */
  label?: string;
}

/** @public */
export interface AppHeaderBadge {
  label: string;
  /** EUI badge color. `filled` is intentionally excluded. */
  color?: 'hollow' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  tooltip?: string;
  onClick?: () => void;
  onClickAriaLabel?: string;
  'data-test-subj'?: string;
  /** @deprecated Used for compatibility with existing breadcrumb badge custom renderers. */
  renderCustomBadge?: (props: { badgeText: string }) => ReactElement;
  /** Popover menu items for badge context menus. When provided, the badge becomes a dropdown trigger. */
  items?: AppHeaderBadgeItem[];
  /** Width of the popover menu panel in pixels. */
  popoverWidth?: number;
}

/** @public */
export interface AppHeaderBadgeItem {
  name: string;
  icon?: string;
  onClick?: () => void;
  items?: AppHeaderBadgeItem[];
  popoverWidth?: number;
  'data-test-subj'?: string;
  disabled?: boolean;
  toolTipContent?: string;
}

/** @public */
export interface AppHeaderTab {
  id: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number;
  'data-test-subj'?: string;
}

/** @public */
export type AppHeaderMetadataItem =
  | AppHeaderMetadataTextItem
  | AppHeaderMetadataButtonItem
  | AppHeaderMetadataHealthItem;

/** @public */
export type AppHeaderMetadataItems = readonly [
  AppHeaderMetadataItem,
  AppHeaderMetadataItem?,
  AppHeaderMetadataItem?
];

/** @public */
export interface AppHeaderMetadataTextItem {
  type: 'text';
  label: string;
  'data-test-subj'?: string;
}

/** @public */
export type AppHeaderMetadataButtonItem =
  | AppHeaderMetadataButtonAction
  | AppHeaderMetadataButtonLink;

/** @public */
export interface AppHeaderMetadataButtonBase {
  type: 'button';
  label: string;
  iconType?: string;
  'data-test-subj'?: string;
}

/** @public */
export interface AppHeaderMetadataButtonAction extends AppHeaderMetadataButtonBase {
  onClick: () => void;
  href?: never;
}

/** @public */
export interface AppHeaderMetadataButtonLink extends AppHeaderMetadataButtonBase {
  href: string;
  onClick?: never;
}

/** @public */
export interface AppHeaderMetadataHealthItem {
  type: 'health';
  label: string;
  color: string;
  'data-test-subj'?: string;
}

/** @public */
export interface AppHeaderConfig {
  title?: string;
  back?: AppHeaderBack;
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  menu?: AppMenuConfig;
  favorite?: ReactNode;
  metadata?: AppHeaderMetadataItems;
}

/**
 * Chrome Next rollout APIs.
 *
 * @remarks
 * This namespace starts with the rollout state and will host additional Chrome Next APIs as
 * follow-up feature slices land behind the same flag.
 *
 * @public
 */
export interface ChromeNext {
  /** Whether the Chrome Next feature flag is enabled. */
  readonly isEnabled: boolean;
  /** Global search configuration. */
  globalSearch: {
    /**
     * Set the global search configuration for the Chrome-Next header.
     * Chrome renders a search button; clicking it fires `onClick`.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: GlobalSearchConfig): void;
  };
  /** Context switcher content. */
  contextSwitcher: {
    /**
     * Set the context switcher content for the Chrome-Next header.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  appHeader: {
    /**
     * Set the app header configuration for the Chrome Next project header.
     * Chrome renders an application top bar with back navigation, title, tabs,
     * badges, menu, share action, and favorite action based on this config.
     * Pass the config to show; the returned callback removes it.
     * Per-app, cleared on app change.
     */
    set(config: AppHeaderConfig): () => void;
  };
}
