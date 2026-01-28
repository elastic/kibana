/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * View mode for the content list display.
 */
export type ViewMode = 'table' | 'grid';

/**
 * Actions available for card interactions.
 */
export interface CardActions {
  /** Navigate to the item. */
  onClick?: () => void;
  /** Get the href for the item link. */
  getHref?: () => string;
  /** Toggle starred status. */
  onToggleStarred?: () => void;
  /** Whether the item is currently starred. */
  isStarred?: boolean;
  /** Open the actions menu. */
  onOpenActions?: () => void;
}

/**
 * Props for the {@link ContentListCard} component.
 */
export interface ContentListCardProps {
  /** The item to render. */
  item: ContentListItem;
  /** Icon type to display at the top of the card. */
  iconType?: string;
  /** Whether to show tags in the footer. */
  showTags?: boolean;
  /** Whether to show the starred button. */
  showStarred?: boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Props for the {@link ContentListGrid} component.
 */
export interface ContentListGridProps {
  /** Optional title for screen readers. */
  title?: string;
  /** Icon type to display on each card (e.g., "dashboardApp"). */
  iconType?: string;
  /** Optional custom card renderer. */
  renderCard?: (item: ContentListItem, actions: CardActions) => ReactNode;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Props for the {@link ViewModeToggle} component.
 */
export interface ViewModeToggleProps {
  /** Current view mode. */
  viewMode: ViewMode;
  /** Callback when view mode changes. */
  onChange: (mode: ViewMode) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
