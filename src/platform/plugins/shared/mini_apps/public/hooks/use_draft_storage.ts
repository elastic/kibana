/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'miniApps.draft.';

interface DraftData {
  name: string;
  script_code: string;
  saved_at: string;
}

export interface UseDraftStorageReturn {
  /** Whether a draft exists that differs from the saved version */
  hasDraft: boolean;
  /** Load the draft from localStorage (returns null if none exists) */
  loadDraft: () => DraftData | null;
  /** Save current form state as a draft */
  saveDraft: (name: string, scriptCode: string) => void;
  /** Discard the draft from localStorage */
  discardDraft: () => void;
}

/**
 * Hook to persist editor form state to localStorage as a draft.
 * Drafts are keyed by mini app ID (or 'new' for create mode).
 * Auto-saves on changes with a debounce.
 */
export const useDraftStorage = (appId: string | undefined): UseDraftStorageReturn => {
  const key = `${STORAGE_PREFIX}${appId ?? 'new'}`;
  const [hasDraft, setHasDraft] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setHasDraft(stored !== null);
    } catch {
      setHasDraft(false);
    }
  }, [key]);

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as DraftData;
    } catch {
      return null;
    }
  }, [key]);

  const saveDraft = useCallback(
    (name: string, scriptCode: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const draft: DraftData = {
            name,
            script_code: scriptCode,
            saved_at: new Date().toISOString(),
          };
          localStorage.setItem(key, JSON.stringify(draft));
          setHasDraft(true);
        } catch {
          // localStorage full or unavailable
        }
      }, 1000);
    },
    [key]
  );

  const discardDraft = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setHasDraft(false);
  }, [key]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { hasDraft, loadDraft, saveDraft, discardDraft };
};
