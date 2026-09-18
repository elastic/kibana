/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apm } from '@elastic/apm-rum';
import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import { importJsonFlyoutStrings } from './import_json_strings';
import type { CreateFromJson, ImportJsonFlyoutServices, SanitizeImportJson } from './types';

/** Client-side import limit; deployments may configure `server.maxPayload` differently. */
const MAX_IMPORT_JSON_FILE_BYTES = 1_048_576;

interface UseImportJsonFlyoutStateParams<SanitizedState> {
  title: string;
  closeFlyout: () => void;
  services: ImportJsonFlyoutServices;
  serverValidationErrorTitle: string;
  sanitizeImportJson: SanitizeImportJson<SanitizedState>;
  createFromJson: CreateFromJson<SanitizedState>;
  onImportSuccess: (id: string, title: string) => void;
}

export const useImportJsonFlyoutState = <SanitizedState>({
  title,
  closeFlyout,
  services,
  serverValidationErrorTitle,
  sanitizeImportJson,
  createFromJson,
  onImportSuccess,
}: UseImportJsonFlyoutStateParams<SanitizedState>) => {
  const [filePickerError, setFilePickerError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [relatedItems, setRelatedItems] = useState<AsCodeRelatedItem[]>([]);
  const [relatedItemsCount, setRelatedItemsCount] = useState(0);
  const [sanitizedState, setSanitizedState] = useState<SanitizedState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileSelectionId, setFileSelectionId] = useState(0);
  const sanitizeAbortRef = useRef<AbortController | null>(null);

  const abortSanitize = useCallback(() => {
    sanitizeAbortRef.current?.abort();
    sanitizeAbortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortSanitize();
    };
  }, [abortSanitize]);

  const onFileChange = useCallback(
    async (files: FileList | null) => {
      abortSanitize();
      setFilePickerError(null);
      setServerError(null);
      setWarnings([]);
      setRelatedItems([]);
      setRelatedItemsCount(0);
      setSanitizedState(null);
      setFileSelectionId((currentId) => currentId + 1);
      const selected = files?.[0] ?? null;

      if (!selected) {
        setIsValidating(false);
        return;
      }

      if (selected.size > MAX_IMPORT_JSON_FILE_BYTES) {
        setFilePickerError(importJsonFlyoutStrings.getFileTooLargeError());
        setIsValidating(false);
        return;
      }

      const abortController = new AbortController();
      sanitizeAbortRef.current = abortController;
      setIsValidating(true);
      try {
        const text = await selected.text();
        if (abortController.signal.aborted) return;

        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          setFilePickerError(importJsonFlyoutStrings.getInvalidJsonError());
          return;
        }

        try {
          const {
            data,
            warnings: sanitizeWarnings,
            relatedItems: sanitizeRelatedItems = [],
            relatedItemsCount: sanitizeRelatedItemsCount,
          } = await sanitizeImportJson(raw, abortController.signal);
          if (abortController.signal.aborted) return;
          setWarnings(sanitizeWarnings);
          setRelatedItems(sanitizeRelatedItems);
          setRelatedItemsCount(sanitizeRelatedItemsCount ?? sanitizeRelatedItems.length);
          setSanitizedState(data);
        } catch (error) {
          const wasAborted =
            abortController.signal.aborted ||
            (error instanceof Error && error.name === 'AbortError');
          if (wasAborted) {
            return;
          }
          const capturedError = error instanceof Error ? error : new Error(String(error));
          apm.captureError(capturedError, {
            labels: {
              error_type: 'SanitizeImportJsonFailure',
            },
          });
          setServerError(serverValidationErrorTitle);
        }
      } finally {
        if (sanitizeAbortRef.current === abortController) {
          sanitizeAbortRef.current = null;
          setIsValidating(false);
        }
      }
    },
    [abortSanitize, sanitizeImportJson, serverValidationErrorTitle]
  );

  const onImport = useCallback(async () => {
    if (!sanitizedState) return;

    setIsImporting(true);
    try {
      const result = await createFromJson(sanitizedState);
      closeFlyout();
      onImportSuccess(result.id, result.title);
    } catch (error) {
      services.notifications.toasts.addDanger({
        title,
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsImporting(false);
    }
  }, [sanitizedState, createFromJson, closeFlyout, onImportSuccess, services, title]);

  return {
    filePickerError,
    serverError,
    warnings,
    relatedItems,
    relatedItemsCount,
    isValidating,
    isImporting,
    fileSelectionId,
    canImport:
      Boolean(sanitizedState) && !isValidating && !isImporting && !filePickerError && !serverError,
    onFileChange,
    onImport,
  };
};
