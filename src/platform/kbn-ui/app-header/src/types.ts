/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, MouseEventHandler } from 'react';
import type { IconType } from '@elastic/eui';
import type { AppMenuConfig } from '@kbn/ui-app-menu';
import type { FavoriteButtonStatus } from '@kbn/ui-favorite-button';

export type AppHeaderBack = string | AppHeaderBackTarget;

export interface AppHeaderBackTarget {
  href: string;
  /**
   * Optional handler for behavior that differs from `href` navigation.
   * Do not use it to navigate to `href`; Kibana handles same-origin links as SPA navigation.
   */
  onClick?: MouseEventHandler;
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
  /**
   * @deprecated Escape hatch for badges that cannot be represented with structured props.
   * Prefer structured badge props for consistent behavior and styling.
   */
  renderCustomBadge?: (props: { badgeText: string }) => ReactElement;
  /** Popover menu items for badge context menus. When provided, the badge becomes a dropdown trigger. */
  items?: AppHeaderBadgeItem[];
  /** Width of the popover menu panel in pixels. */
  popoverWidth?: number;
}

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

export interface AppHeaderTabIconBadge {
  /** EUI icon type rendered in the tab badge. */
  iconType: string;
  /** Optional tooltip shown when hovering the badge icon. */
  tooltip?: string;
}

/**
 * Tab badge: either a numeric count (rendered as a notification badge) or an icon
 * with an optional tooltip.
 */
export type AppHeaderTabBadge = number | AppHeaderTabIconBadge;

export interface AppHeaderTabAction {
  id: string;
  label: string;
  /** EUI icon type rendered next to the action label. */
  iconType?: IconType;
  /** Disables the action if `true` or if the function returns `true`. */
  disabled?: boolean | (() => boolean);
  onClick: () => void;
  'data-test-subj'?: string;
}

/**
 * Optional overflow actions for a tab, rendered as an ellipsis popover appended to the tab.
 *
 * @remarks
 * Actions are intentionally flat (a single level of items). Nested submenus, modals/flyouts and
 * focus return are not supported yet; when a use case arises, mirror the AppMenu approach
 * (`AppMenuRunActionParams` in `@kbn/ui-app-menu`) by adding a nested `items`
 * prop and passing an anchor/`returnFocus` handler down to `onClick`.
 */
export interface AppHeaderTabActions {
  /** Accessible label and tooltip for the ellipsis trigger. */
  ariaLabel: string;
  items: AppHeaderTabAction[];
  /** `data-test-subj` for the ellipsis trigger button. */
  'data-test-subj'?: string;
}

export interface AppHeaderTab {
  id: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: AppHeaderTabBadge;
  'data-test-subj'?: string;
  disabled?: boolean;
  toolTipContent?: string;
  /**
   * Optional overflow actions rendered as an ellipsis popover appended to the tab. Only surfaced
   * for the selected tab (`isSelected`); may be provided unconditionally.
   */
  actions?: AppHeaderTabActions;
}

export type AppHeaderMetadataItem =
  | AppHeaderMetadataTextItem
  | AppHeaderMetadataButtonItem
  | AppHeaderMetadataHealthItem;

export type AppHeaderMetadataItems = readonly [
  AppHeaderMetadataItem,
  AppHeaderMetadataItem?,
  AppHeaderMetadataItem?
];

export interface AppHeaderMetadataTextItem {
  type: 'text';
  /** When `value` is set, this acts as the bold key (e.g. "Created by"). */
  label: string;
  /** Optional value rendered next to `label` in a subdued color. */
  value?: string;
  'data-test-subj'?: string;
}

export type AppHeaderMetadataButtonItem =
  | AppHeaderMetadataButtonAction
  | AppHeaderMetadataButtonLink;

export interface AppHeaderMetadataButtonBase {
  type: 'button';
  label: string;
  'data-test-subj'?: string;
}

export interface AppHeaderMetadataButtonAction extends AppHeaderMetadataButtonBase {
  onClick: () => void;
  href?: never;
}

export interface AppHeaderMetadataButtonLink extends AppHeaderMetadataButtonBase {
  href: string;
  onClick?: never;
}

export interface AppHeaderMetadataHealthItem {
  type: 'health';
  label: string;
  color: string;
  'data-test-subj'?: string;
}

export type AppHeaderTitleSaveResult = string | void;

export interface AppHeaderEditableTitle {
  /** Current title text rendered in the header. */
  text: string;
  /**
   * Commits a rename. Receives the trimmed new title. Return nothing on success; return an
   * error string to reject the value -- it is shown inline and the editor stays open.
   * Thrown or rejected errors are caught and surfaced as a generic error.
   */
  onSave: (nextTitle: string) => AppHeaderTitleSaveResult | Promise<AppHeaderTitleSaveResult>;
  /**
   * Accessible label for the edit input, naming what is being renamed (the title is the
   * dashboard/case/etc. name, not a generic "page title"). Prefer a context-specific label
   * such as "Edit dashboard name". Falls back to a generic label when omitted.
   */
  ariaLabel?: string;
  /**
   * Hint shown when the title is empty: muted text in read mode and the input placeholder
   * in edit mode. Name the entity being created, e.g. "Untitled dashboard".
   */
  placeholder?: string;
}

export type AppHeaderTitle = string | AppHeaderEditableTitle;

/**
 * Outer header spacing. `standard` is a 16px symmetric inset, `compact` is an 8px inset, and
 * `flush` lets the surrounding layout own the inset. `bleed` and `largeBleed` must match a direct
 * parent's 16px or 24px symmetric padding respectively (e.g. when the header is wrapped by
 * `EuiPageTemplate`). Bleed modes are compatibility options for headers that cannot yet move
 * outside the padded content section.
 */
export type AppHeaderSpacing = 'standard' | 'compact' | 'flush' | 'bleed' | 'largeBleed';

export type AppHeaderFavoriteStatus = FavoriteButtonStatus;

/**
 * Favorite action for the app-header title-actions area.
 */
export interface AppHeaderFavoriteAction {
  status: AppHeaderFavoriteStatus;
  onToggle: () => void;
  isDisabled?: boolean;
}

/**
 * Share action for the app-header title-actions area.
 * Apps own behavior and menu placement; App Header owns title presentation.
 */
export interface AppHeaderShareAction {
  onClick: (context: { returnFocus: () => void }) => void | Promise<void>;
  isDisabled?: boolean;
  tooltip?: {
    content: string;
    title?: string;
  };
}

/**
 * Plain-text page description. Use the object form to add a URL rendered with a fixed
 * "Learn more" label.
 */
export type AppHeaderDescription =
  | string
  | {
      text: string;
      learnMoreUrl: string;
    };

interface AppHeaderConfigBase {
  title?: AppHeaderTitle;
  back?: AppHeaderBack;
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  menu?: AppMenuConfig;
  favorite?: AppHeaderFavoriteAction;
  share?: AppHeaderShareAction;
  /**
   * Defaults to `standard`, except a sparse header (no title, badges, tabs, description, metadata,
   * title append, favorite, or share) defaults to `compact`. An explicit value always wins.
   */
  spacing?: AppHeaderSpacing;
}

type AppHeaderSecondaryContent =
  | {
      description?: AppHeaderDescription;
      metadata?: never;
    }
  | {
      description?: never;
      metadata?: AppHeaderMetadataItems;
    };

export type AppHeaderConfig = AppHeaderConfigBase & AppHeaderSecondaryContent;

export type AppHeaderMenu = AppMenuConfig;
