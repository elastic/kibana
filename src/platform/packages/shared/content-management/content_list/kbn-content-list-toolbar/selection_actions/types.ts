/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Known selection action IDs that map to built-in handlers from the provider.
 */
export const KNOWN_ACTION_IDS = ['delete', 'export'] as const;

/**
 * Type for known selection action IDs.
 */
export type KnownActionId = (typeof KNOWN_ACTION_IDS)[number];

/**
 * Base props shared by all selection action marker components.
 */
export interface BaseActionProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Context passed to action builders.
 */
export interface ActionBuilderContext {
  /** Number of currently selected items. */
  selectedCount: number;
  /** Function to get the selected items. */
  getSelectedItems: () => ContentListItem[];
  /** Function to clear the current selection. */
  clearSelection: () => void;
  /** Handler for deletion of selected items (from provider). */
  onSelectionDelete?: (items: ContentListItem[]) => void;
  /** Handler for export of selected items (from provider). */
  onSelectionExport?: (items: ContentListItem[]) => void;
  /** Singular name for the entity type (e.g., "dashboard"). */
  entityName: string;
  /** Plural name for the entity type (e.g., "dashboards"). */
  entityNamePlural: string;
}

/**
 * Result of building an action - a React element or null.
 */
export type ActionBuildResult = ReactElement | null;

/**
 * Action builder function type.
 */
export type ActionBuilder<TConfig = unknown> = (
  config: TConfig,
  context: ActionBuilderContext
) => ActionBuildResult;
