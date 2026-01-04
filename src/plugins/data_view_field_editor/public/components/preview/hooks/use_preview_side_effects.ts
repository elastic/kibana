/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

export const DEFAULT_PREVIEW_DEBOUNCE_MS = 500;

export interface PreviewSideEffectsArgs {
  isPanelVisible: boolean;
  refetchKey?: unknown;
  fetchSampleDocuments: () => void | Promise<void>;

  updatePreview: () => void | Promise<void>;

  customDocIdToLoad: string | null;
  loadDocument: (id: string) => void | Promise<void>;

  debounceMs?: number;
}

export const usePreviewSideEffects = ({
  isPanelVisible,
  refetchKey,
  fetchSampleDocuments,
  updatePreview,
  customDocIdToLoad,
  loadDocument,
  debounceMs = DEFAULT_PREVIEW_DEBOUNCE_MS,
}: PreviewSideEffectsArgs) => {
  // Fetch sample documents when the panel is visible (and when the refetch key changes).
  useEffect(() => {
    if (isPanelVisible) {
      fetchSampleDocuments();
    }
  }, [isPanelVisible, fetchSampleDocuments, refetchKey]);

  // Debounced preview update.
  const runUpdatePreview = useCallback(() => {
    void updatePreview();
  }, [updatePreview]);
  useDebounce(runUpdatePreview, debounceMs, [runUpdatePreview]);

  // Debounced document loading by ID.
  const runLoadDocument = useCallback(() => {
    const docId = customDocIdToLoad?.trim();
    if (!docId) {
      return;
    }
    void loadDocument(docId);
  }, [customDocIdToLoad, loadDocument]);
  useDebounce(runLoadDocument, debounceMs, [runLoadDocument]);
};
