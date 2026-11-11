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
import { isHttpFetchError } from '@kbn/core-http-browser';
import { importJsonFlyoutStrings } from './import_json_strings';
import { isImportJsonValidationError } from './import_json_validation_error';
import type {
  CreateFromJson,
  ImportJsonFlyoutServices,
  ImportJsonRelatedItem,
  SanitizeImportJson,
} from './types';

/** Client-side import limit; deployments may configure `server.maxPayload` differently. */
const MAX_IMPORT_JSON_FILE_BYTES = 1_048_576;
/** Pasted or typed JSON is validated once the user pauses, not on every keystroke. */
const TEXT_VALIDATION_DELAY_MS = 300;

// Only 4xx messages describe user-fixable input; 5xx details stay in server logs.
const getClientErrorMessage = (error: unknown): string | undefined => {
  if (!isHttpFetchError(error)) return;
  const status = error.response?.status ?? 0;
  if (status < 400 || status > 499) return;
  const { body } = error;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    return typeof body.message === 'string' && body.message ? body.message : undefined;
  }
};

interface UseImportJsonFlyoutStateParams<SanitizedState> {
  title: string;
  closeFlyout: () => void;
  services: ImportJsonFlyoutServices;
  sanitizeImportJson: SanitizeImportJson<SanitizedState>;
  createFromJson: CreateFromJson<SanitizedState>;
  onImportSuccess: (id: string, title: string) => void;
}

/** Holds the validation and import state of JSON coming from a file or from pasted text. */
export const useImportJsonFlyoutState = <SanitizedState>({
  title,
  closeFlyout,
  services,
  sanitizeImportJson,
  createFromJson,
  onImportSuccess,
}: UseImportJsonFlyoutStateParams<SanitizedState>) => {
  const [jsonText, setJsonText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<{ details?: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [relatedItems, setRelatedItems] = useState<ImportJsonRelatedItem[]>([]);
  const [relatedItemsCount, setRelatedItemsCount] = useState(0);
  const [sanitizedState, setSanitizedState] = useState<SanitizedState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [inputVersion, setInputVersion] = useState(0);
  const jsonTextRef = useRef('');
  const sanitizeAbortRef = useRef<AbortController | null>(null);
  const textValidationTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const cancelValidation = useCallback(() => {
    clearTimeout(textValidationTimerRef.current);
    textValidationTimerRef.current = undefined;
    sanitizeAbortRef.current?.abort();
    sanitizeAbortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelValidation();
    };
  }, [cancelValidation]);

  const resetValidation = useCallback(() => {
    cancelValidation();
    setInputError(null);
    setServerError(null);
    setWarnings([]);
    setRelatedItems([]);
    setRelatedItemsCount(0);
    setSanitizedState(null);
    setIsValidating(false);
    setInputVersion((currentVersion) => currentVersion + 1);
  }, [cancelValidation]);

  const validateJson = useCallback(
    async (readText: (signal: AbortSignal) => Promise<string>, invalidJsonError: string) => {
      const abortController = new AbortController();
      sanitizeAbortRef.current = abortController;
      setIsValidating(true);
      try {
        const text = await readText(abortController.signal);
        if (abortController.signal.aborted) return;

        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          setInputError(invalidJsonError);
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
          if (isImportJsonValidationError(error)) {
            setInputError(error.message);
            return;
          }
          const capturedError = error instanceof Error ? error : new Error(String(error));
          apm.captureError(capturedError, {
            labels: {
              error_type: 'SanitizeImportJsonFailure',
            },
          });
          setServerError({ details: getClientErrorMessage(error) });
        }
      } finally {
        if (sanitizeAbortRef.current === abortController) {
          sanitizeAbortRef.current = null;
          setIsValidating(false);
        }
      }
    },
    [sanitizeImportJson]
  );

  const onFileChange = useCallback(
    async (files: FileList | null) => {
      resetValidation();
      const selected = files?.[0] ?? null;

      if (!selected) {
        return;
      }

      if (selected.size > MAX_IMPORT_JSON_FILE_BYTES) {
        setInputError(importJsonFlyoutStrings.getFileTooLargeError());
        return;
      }

      await validateJson(async (signal) => {
        const text = await selected.text();
        if (!signal.aborted) {
          jsonTextRef.current = text;
          setJsonText(text);
        }
        return text;
      }, importJsonFlyoutStrings.getInvalidJsonError());
    },
    [resetValidation, validateJson]
  );

  const onTextChange = useCallback(
    (text: string) => {
      if (text === jsonTextRef.current) return;
      jsonTextRef.current = text;
      setJsonText(text);
      resetValidation();

      if (!text.trim()) {
        return;
      }

      if (new Blob([text]).size > MAX_IMPORT_JSON_FILE_BYTES) {
        setInputError(importJsonFlyoutStrings.getTextTooLargeError());
        return;
      }

      textValidationTimerRef.current = setTimeout(() => {
        textValidationTimerRef.current = undefined;
        void validateJson(async () => text, importJsonFlyoutStrings.getInvalidTextError());
      }, TEXT_VALIDATION_DELAY_MS);
    },
    [resetValidation, validateJson]
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
        text: getClientErrorMessage(error) ?? importJsonFlyoutStrings.getGenericImportError(),
      });
    } finally {
      setIsImporting(false);
    }
  }, [sanitizedState, createFromJson, closeFlyout, onImportSuccess, services, title]);

  return {
    jsonText,
    inputError,
    serverError,
    warnings,
    relatedItems,
    relatedItemsCount,
    sanitizedState,
    isValidating,
    isImporting,
    inputVersion,
    canImport:
      Boolean(sanitizedState) && !isValidating && !isImporting && !inputError && !serverError,
    onFileChange,
    onTextChange,
    onImport,
  };
};
