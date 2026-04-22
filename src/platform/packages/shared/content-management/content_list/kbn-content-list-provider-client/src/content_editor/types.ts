/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type {
  ContentEditorCustomValidators,
  OpenContentEditorParams,
} from '@kbn/content-management-content-editor';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Content editor configuration for `ContentListClientProvider`.
 *
 * This is the Kibana-specific content editor integration. The base
 * `ContentListProvider` only knows about a simple `onInspect` callback;
 * this config produces that callback by wiring it to the Kibana content
 * editor flyout.
 */
export interface ContentEditorConfig {
  /**
   * Callback to open the content editor flyout.
   * Obtained from `useOpenContentEditor()` in `@kbn/content-management-content-editor`.
   */
  openContentEditor: (params: OpenContentEditorParams) => () => void;

  /** Whether the content editor is readonly. Defaults to `false`. */
  isReadonly?: boolean;

  /** Custom validators for title/description fields. */
  customValidators?: ContentEditorCustomValidators;

  /**
   * Called when the user saves metadata edits.
   * Receives the updated metadata fields. The callback should persist changes
   * and return a resolved promise on success.
   */
  onSave?: (args: {
    id: string;
    title: string;
    description?: string;
    tags: string[];
  }) => Promise<void>;

  /**
   * Optional render prop for additional rows in the content editor flyout.
   * Used by Dashboard to show content insights (panel counts, activity, etc.).
   */
  appendRows?: (item: ContentListItem) => ReactNode;
}
