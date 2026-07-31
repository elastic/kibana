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
import type { ESQLEditorDeps } from '../types';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

interface UseNlGenerationParams {
  query: string;
  onNlResult?: (generatedQuery: string) => void;
  onUpdateAndSubmitQuery: (query: string) => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export const useNlGeneration = ({
  query,
  onNlResult,
  onUpdateAndSubmitQuery,
  telemetryService,
}: UseNlGenerationParams) => {
  const { core } = useKibana<ESQLEditorDeps>().services;
  const isNlToEsqlEnabled = useNlToEsqlCheck();

  const [nlValue, setNlValue] = useState('');
  const [isNlLoading, setIsNlLoading] = useState(false);
  const [hasConnector, setHasConnector] = useState<boolean | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isNlToEsqlEnabled) return;
    core.http
      .get<{ connectors: unknown[] }>('/internal/inference/connectors')
      .then((res) => setHasConnector(res.connectors.length > 0))
      .catch(() => setHasConnector(false));
  }, [isNlToEsqlEnabled, core.http]);

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
    setIsNlLoading(false);
    setNlValue('');
  }, []);

  const onNlSubmit = useCallback(async () => {
    const trimmed = nlValue.trim();
    if (!trimmed || isNlLoading) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsNlLoading(true);
    const startTime = Date.now();
    try {
      const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({ nlInstruction: trimmed, currentQuery: query }),
        signal: abortController.signal,
      });
      if (result.content) {
        trackNlResult(
          trimmed.length,
          query.length,
          startTime,
          true,
          undefined,
          result.content.length
        );
        if (onNlResult) {
          onNlResult(result.content);
        } else {
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
      setNlValue('');
      if (!abortController.signal.aborted) {
        setIsNlLoading(false);
      }
    }
  }, [
    nlValue,
    isNlLoading,
    query,
    core.http,
    core.notifications.toasts,
    onNlResult,
    onUpdateAndSubmitQuery,
    trackNlResult,
  ]);

  return { nlValue, setNlValue, isNlLoading, hasConnector, onNlSubmit, onStopGeneration };
};
