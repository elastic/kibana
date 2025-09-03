/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  CanOverrideHoverActions,
  PublishesUnsavedChanges,
  SerializedTitles,
} from '@kbn/presentation-publishing';

/**
 * The markdown editor's own state. Every embeddable type should separate out its own self-managed state, from state
 * supplied by other common managers.
 */
export interface MarkdownEditorState {
  content: string;
}

/**
 * Markdown serialized state includes all state that the parent should provide to this embeddable.
 */
export type MarkdownEditorSerializedState = SerializedTitles & MarkdownEditorState;

export type MarkdownEditorApi = DefaultEmbeddableApi<MarkdownEditorSerializedState> &
  PublishesUnsavedChanges &
  HasEditCapabilities &
  CanOverrideHoverActions;
