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
  HasLibraryTransforms,
  HasType,
} from '@kbn/presentation-publishing';
import type {
  MarkdownByReferenceState,
  MarkdownByValueState,
  MarkdownEmbeddableState,
} from '../server';
import type { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';

export type MarkdownEditorApi = HasType<typeof MARKDOWN_EMBEDDABLE_TYPE> &
  DefaultEmbeddableApi<MarkdownEmbeddableState> &
  PublishesUnsavedChanges &
  HasEditCapabilities &
  CanOverrideHoverActions &
  HasLibraryTransforms<MarkdownByReferenceState, MarkdownByValueState>;
