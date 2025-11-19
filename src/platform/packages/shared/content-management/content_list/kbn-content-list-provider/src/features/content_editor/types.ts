/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { ContentListItem } from '../../item';

/**
 * Arguments passed to the `onSave` callback when saving content editor changes.
 */
export interface ContentEditorSaveArgs {
  /** The item ID. */
  id: string;
  /** The updated title. */
  title: string;
  /** The updated description. */
  description?: string;
  /** Array of tag IDs. */
  tags: string[];
}

/**
 * Validator function for content editor fields.
 */
export interface ContentEditorValidator {
  /** The type of validation result. */
  type: 'warning' | 'error';
  /** Async validation function. Returns error/warning message or undefined if valid. */
  fn: (value: string, id: string) => Promise<string | undefined> | string | undefined;
}

/**
 * Custom validators for content editor fields.
 */
export interface ContentEditorValidators {
  /** Validators for the title field. */
  title?: ContentEditorValidator[];
  /** Validators for the description field. */
  description?: ContentEditorValidator[];
}

/**
 * Content editor feature configuration.
 *
 * When provided in `features.contentEditor`, automatically enables the "View details"
 * action on items (unless explicitly provided in `item.actions.onViewDetails`).
 *
 * @example
 * ```tsx
 * <ContentListServerKibanaProvider
 *   features={{
 *     contentEditor: {
 *       onSave: async ({ id, title, description, tags }) => {
 *         await myClient.updateMeta(id, { title, description, tags });
 *       },
 *       customValidators: {
 *         title: [{ type: 'warning', fn: checkDuplicateTitle }],
 *       },
 *       isReadonly: (item) => item.isManaged,
 *       readonlyReason: (item) => item.isManaged ? 'Managed item' : undefined,
 *       appendRows: (item) => <ActivityView item={item} />,
 *     },
 *   }}
 * />
 * ```
 */
export interface ContentEditorConfig {
  /**
   * Handler for saving changes from the content editor.
   * Required if items are not readonly.
   *
   * Note: The table automatically refreshes and the flyout closes after save.
   */
  onSave?: (args: ContentEditorSaveArgs) => Promise<void>;

  /**
   * Custom validators for the content editor form fields.
   * Use to add custom validation logic like duplicate title checks.
   */
  customValidators?: ContentEditorValidators;

  /**
   * Function to determine if an item should be opened in readonly mode.
   * When true, the save button is hidden.
   *
   * @default (item) => item.isManaged ?? false
   */
  isReadonly?: (item: ContentListItem) => boolean;

  /**
   * Function to get a reason message for readonly mode.
   * Displayed to the user when the item is readonly.
   */
  readonlyReason?: (item: ContentListItem) => string | undefined;

  /**
   * Custom rows to append to the content editor flyout.
   * Commonly used to display activity/insights information.
   *
   * @example
   * ```tsx
   * appendRows: (item) => (
   *   <ContentEditorActivityRow item={item} entityNamePlural="dashboards" />
   * )
   * ```
   */
  appendRows?: (item: ContentListItem) => ReactNode;

  /**
   * Optional content insights client for activity tracking and display.
   * When provided, enables activity views in the content editor.
   */
  contentInsightsClient?: ContentInsightsClientPublic;
}
