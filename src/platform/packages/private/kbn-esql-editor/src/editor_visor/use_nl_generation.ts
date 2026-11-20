/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import { reportEsqlError } from '../report_error';
import { nlErrorMessage } from './visor_i18n';
import type { ESQLEditorDeps, VisorNlResultHandler } from '../types';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

// The esql service caches the lookup itself; this mirror lets the next visor start with the
// last known result synchronously instead of flashing the AI button in after the promise resolves
let hasInferenceConnector: boolean | undefined;

/** Drops the last known connector result so tests can change it. */
export const clearInferenceConnectorCache = (): void => {
  hasInferenceConnector = undefined;
};

export interface NlSubmitOptions {
  // Applies the result directly even when the host reviews generated queries, for a prompt that
  // arrived with the editor and so has no query of the user's to protect yet. The review still
  // applies if the query is edited while the request runs
  skipReview?: boolean;
}

interface UseNlGenerationParams {
  query: string;
  nlValue: string;
  setNlValue: (value: string) => void;
  onNlResult?: VisorNlResultHandler;
  onNlReject?: () => void;
  onUpdateAndSubmitQuery: (query: string) => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export const useNlGeneration = ({
  query,
  nlValue,
  setNlValue,
  onNlResult,
  onNlReject,
  onUpdateAndSubmitQuery,
  telemetryService,
}: UseNlGenerationParams) => {
  const { core, esql } = useKibana<ESQLEditorDeps>().services;
  const isNlToEsqlEnabled = useNlToEsqlCheck();

  const [isNlLoading, setIsNlLoading] = useState(false);
  const [hasConnector, setHasConnector] = useState<boolean | undefined>(hasInferenceConnector);
  const abortControllerRef = useRef<AbortController | null>(null);
  // What the editor shows now, to compare with the query a request was sent with once it settles
  const latestQueryRef = useRef(query);
  latestQueryRef.current = query;

  useEffect(() => {
    if (!isNlToEsqlEnabled || !esql) return;
    let cancelled = false;
    esql.hasInferenceConnector().then((available) => {
      hasInferenceConnector = available;
      if (!cancelled) {
        setHasConnector(available);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isNlToEsqlEnabled, esql]);

  const trackNlResult = useCallback(
    (
      nlLength: number,
      contextQueryLength: number,
      startTime: number,
      success: boolean,
      errorCode?: string,
      generatedQueryLength?: number
    ) =>
      telemetryService?.trackVisorNlSubmitted({
        nlLength,
        contextQueryLength,
        success,
        durationMs: Date.now() - startTime,
        ...(errorCode ? { errorCode } : {}),
        ...(generatedQueryLength !== undefined ? { generatedQueryLength } : {}),
      }),
    [telemetryService]
  );

  const onStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsNlLoading(false);
    setNlValue('');
  }, [setNlValue]);

  const onNlSubmit = useCallback(
    async ({ skipReview = false }: NlSubmitOptions = {}) => {
      const trimmed = nlValue.trim();
      if (!trimmed || isNlLoading) return;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsNlLoading(true);
      const startTime = Date.now();
      let appliedContent = false;
      try {
        const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
          body: JSON.stringify({ nlInstruction: trimmed, currentQuery: query }),
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
        if (result.content) {
          trackNlResult(
            trimmed.length,
            query.length,
            startTime,
            true,
            undefined,
            result.content.length
          );
          // Edits made to the query while the request ran would be lost by applying the result
          // directly, so in that case it goes through the review after all
          const applyDirectly = skipReview && latestQueryRef.current === query;
          if (onNlResult && !applyDirectly) {
            // The prompt stays until the generated query is kept
            onNlResult(result.content, { onAccept: () => setNlValue(''), onReject: onNlReject });
          } else {
            appliedContent = true;
            onUpdateAndSubmitQuery(result.content);
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        reportEsqlError(error, { errorType: 'NlToEsql' });
        const errorCode = String(
          (error as { body?: { statusCode?: number } })?.body?.statusCode ?? ''
        );
        trackNlResult(trimmed.length, query.length, startTime, false, errorCode || undefined);
        const message = (error as { body?: { message?: string } })?.body?.message ?? nlErrorMessage;
        core.notifications.toasts.addDanger({ title: message });
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
          if (appliedContent) {
            setNlValue('');
          }
          setIsNlLoading(false);
        }
      }
    },
    [
      nlValue,
      setNlValue,
      isNlLoading,
      query,
      core.http,
      core.notifications.toasts,
      onNlResult,
      onNlReject,
      onUpdateAndSubmitQuery,
      trackNlResult,
    ]
  );

  return { isNlLoading, hasConnector, onNlSubmit, onStopGeneration };
};
