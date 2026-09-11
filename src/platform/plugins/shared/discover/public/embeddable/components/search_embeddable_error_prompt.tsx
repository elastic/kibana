/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { PresentationPanelError } from '@kbn/embeddable-plugin/public';
import type { InlineEditing } from './saved_search_grid';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

export interface SearchEmbeddableErrorPromptProps {
  error: Error;
  inlineEditing: InlineEditing;
}

/**
 * Renders a search error inside the panel while inline editing, where the platform's blocking
 * error panel would hide the apply/discard footer along with the rest of our content.
 */
export const SearchEmbeddableErrorPrompt = ({
  error,
  inlineEditing,
}: SearchEmbeddableErrorPromptProps) => {
  return (
    <SavedSearchEmbeddableBase inlineEditing={inlineEditing} isLoading={false}>
      <div css={{ height: '100%' }} data-test-subj="discoverEmbeddableErrorCallout">
        {/* `api` is intentionally omitted: its edit action duplicates the inline edit hover actions */}
        <PresentationPanelError error={error} />
      </div>
    </SavedSearchEmbeddableBase>
  );
};
