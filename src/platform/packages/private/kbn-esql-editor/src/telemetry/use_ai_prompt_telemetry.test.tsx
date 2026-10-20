/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { validateQuery } from '@kbn/esql-language';
import {
  AiPromptFeature,
  AiQueryExecutionStatus,
  AiQueryValidationStatus,
  AiReviewAction,
  type ESQLEditorTelemetryService,
} from './telemetry_service';
import { useAiPromptTelemetry } from './use_ai_prompt_telemetry';

jest.mock('@kbn/esql-language', () => ({
  ...jest.requireActual('@kbn/esql-language'),
  validateQuery: jest.fn(),
}));

describe('useAiPromptTelemetry', () => {
  const trackAiPromptResolved = jest.fn();
  const telemetryService = { trackAiPromptResolved } as unknown as ESQLEditorTelemetryService;
  const esqlCallbacks: ESQLCallbacks = {};

  const resolution = {
    feature: AiPromptFeature.VISOR_NL,
    prompt: 'errors for john.smith@example.com',
    generatedQuery: 'FROM logs | WHERE user == "john.smith@example.com"',
  };

  const renderTelemetryHook = () => {
    const initialProps: { isLoading: boolean; serverErrors?: Error[] } = { isLoading: false };
    return renderHook(
      ({ isLoading, serverErrors }: typeof initialProps) =>
        useAiPromptTelemetry({ telemetryService, esqlCallbacks, isLoading, serverErrors }),
      { initialProps }
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateQuery as jest.Mock).mockResolvedValue({
      errors: [{ message: 'Unknown column [user]' }],
      warnings: [],
    });
  });

  it('reports a rejected proposal right away, anonymized and validated', async () => {
    const { result } = renderTelemetryHook();

    act(() => result.current.onPromptResolved({ ...resolution, outcome: AiReviewAction.REJECT }));

    await waitFor(() =>
      expect(trackAiPromptResolved).toHaveBeenCalledWith({
        feature: AiPromptFeature.VISOR_NL,
        prompt: 'errors for [EMAIL]',
        generatedQuery: 'FROM logs | WHERE user == "[EMAIL]"',
        validationStatus: AiQueryValidationStatus.ERROR,
        outcome: AiReviewAction.REJECT,
        executionStatus: AiQueryExecutionStatus.NOT_RUN,
      })
    );
    expect(validateQuery).toHaveBeenCalledWith(resolution.generatedQuery, esqlCallbacks);
  });

  it('reports an accepted proposal once its run settles, with the run outcome', async () => {
    const { result, rerender } = renderTelemetryHook();

    act(() => result.current.onPromptResolved({ ...resolution, outcome: AiReviewAction.ACCEPT }));
    rerender({ isLoading: true });

    expect(trackAiPromptResolved).not.toHaveBeenCalled();

    rerender({ isLoading: false, serverErrors: [new Error('Unknown column [user]')] });

    await waitFor(() =>
      expect(trackAiPromptResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: AiReviewAction.ACCEPT,
          executionStatus: AiQueryExecutionStatus.ERROR,
        })
      )
    );
    expect(trackAiPromptResolved).toHaveBeenCalledTimes(1);
  });
});
