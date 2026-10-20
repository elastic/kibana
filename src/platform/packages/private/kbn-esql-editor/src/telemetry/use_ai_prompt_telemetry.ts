/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { validateQuery } from '@kbn/esql-language';
import { anonymizeText } from './anonymize_text';
import {
  AiQueryExecutionStatus,
  AiQueryValidationStatus,
  AiReviewAction,
  type AiPromptResolution,
  type ESQLEditorTelemetryService,
  type OnAiPromptResolved,
} from './telemetry_service';

interface UseAiPromptTelemetryParams {
  telemetryService: ESQLEditorTelemetryService;
  esqlCallbacks: ESQLCallbacks;
  isLoading: boolean | undefined;
  serverErrors: Error[] | undefined;
}

const getValidationStatus = async (query: string, callbacks: ESQLCallbacks) => {
  try {
    const { errors, warnings } = await validateQuery(query, callbacks);
    if (errors.length) return AiQueryValidationStatus.ERROR;
    return warnings.length ? AiQueryValidationStatus.WARNING : AiQueryValidationStatus.SUCCESS;
  } catch {
    return AiQueryValidationStatus.WARNING;
  }
};

/**
 * Reports one `esql.ai_prompt_resolved` event per AI proposal: immediately when rejected, and once
 * the accepted run settles, inferring its outcome from `isLoading` / `serverErrors`.
 */
export const useAiPromptTelemetry = ({
  telemetryService,
  esqlCallbacks,
  isLoading,
  serverErrors,
}: UseAiPromptTelemetryParams) => {
  const paramsRef = useRef({ telemetryService, esqlCallbacks });
  paramsRef.current = { telemetryService, esqlCallbacks };
  // An accepted proposal whose run has not settled yet.
  const pendingRef = useRef<{ resolution: AiPromptResolution; isRunning: boolean } | undefined>(
    undefined
  );

  const report = useCallback(
    async (resolution: AiPromptResolution, executionStatus: AiQueryExecutionStatus) => {
      const { generatedQuery, prompt } = resolution;
      const validationStatus = await getValidationStatus(
        generatedQuery,
        paramsRef.current.esqlCallbacks
      );
      paramsRef.current.telemetryService.trackAiPromptResolved({
        ...resolution,
        prompt: anonymizeText(prompt),
        generatedQuery: anonymizeText(generatedQuery),
        validationStatus,
        executionStatus,
      });
    },
    []
  );

  const flushPending = useCallback(
    (executionStatus: AiQueryExecutionStatus) => {
      const pending = pendingRef.current;
      pendingRef.current = undefined;
      if (pending) report(pending.resolution, executionStatus);
    },
    [report]
  );

  const onPromptResolved = useCallback<OnAiPromptResolved>(
    (resolution) => {
      if (resolution.outcome === AiReviewAction.REJECT) {
        report(resolution, AiQueryExecutionStatus.NOT_RUN);
        return;
      }
      flushPending(AiQueryExecutionStatus.UNKNOWN);
      pendingRef.current = { resolution, isRunning: false };
    },
    [report, flushPending]
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (isLoading) {
      pending.isRunning = true;
    } else if (pending.isRunning) {
      flushPending(
        serverErrors?.length ? AiQueryExecutionStatus.ERROR : AiQueryExecutionStatus.SUCCESS
      );
    }
  }, [isLoading, serverErrors, flushPending]);

  useEffect(() => () => flushPending(AiQueryExecutionStatus.UNKNOWN), [flushPending]);

  return { onPromptResolved };
};
