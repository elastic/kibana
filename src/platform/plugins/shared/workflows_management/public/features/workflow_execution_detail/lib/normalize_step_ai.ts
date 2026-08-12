/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTokenUsage } from '@kbn/workflows';

/**
 * Normalized AI metadata for flyout UI. Every field is optional — the UI
 * degrades per-field. Prefer top-level `step.usage` (survives includeOutput:false);
 * enrich from `output.metadata` when the full step payload is loaded.
 */
export interface StepAiMetadata {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  connectorId?: string;
  timeToFirstTokenMs?: number;
  callCount?: number;
}

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const usageFromUnknown = (raw: unknown): Partial<StepAiMetadata> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const u = raw as Record<string, unknown>;
  const inputTokens = asFiniteNumber(
    u.inputTokens ?? u.input_tokens ?? u.prompt_tokens ?? u.promptTokens
  );
  const outputTokens = asFiniteNumber(
    u.outputTokens ?? u.output_tokens ?? u.completion_tokens ?? u.completionTokens
  );
  const totalTokens =
    asFiniteNumber(u.totalTokens ?? u.total_tokens) ??
    (inputTokens !== undefined || outputTokens !== undefined
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : undefined);
  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
};

/**
 * Build UI AI metadata from persisted step `usage` plus optional full output.
 * Returns `undefined` when nothing useful is available (no empty badges/sections).
 */
export const normalizeStepAi = (params: {
  usage?: WorkflowTokenUsage | null;
  output?: unknown;
  connectorId?: string | null;
}): StepAiMetadata | undefined => {
  const { usage, output, connectorId } = params;
  const fromUsage: Partial<StepAiMetadata> = usage
    ? {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      }
    : {};

  let fromOutput: Partial<StepAiMetadata> = {};
  let model: string | undefined;
  let ttft: number | undefined;
  let outputConnectorId: string | undefined;
  let callCount: number | undefined;

  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const o = output as Record<string, unknown>;
    const metadata =
      o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
        ? (o.metadata as Record<string, unknown>)
        : undefined;

    const usageRaw = metadata?.usage ?? o.usage;
    fromOutput = usageFromUnknown(usageRaw);
    model = asNonEmptyString(o.model ?? metadata?.model);
    ttft = asFiniteNumber(
      o.timeToFirstTokenMs ??
        o.time_to_first_token_ms ??
        metadata?.timeToFirstTokenMs ??
        metadata?.time_to_first_token_ms
    );
    const usageObj =
      usageRaw && typeof usageRaw === 'object' && !Array.isArray(usageRaw)
        ? (usageRaw as Record<string, unknown>)
        : undefined;
    outputConnectorId = asNonEmptyString(
      metadata?.connectorId ??
        metadata?.connector_id ??
        o.connectorId ??
        usageObj?.connectorId ??
        usageObj?.connector_id
    );
    callCount = asFiniteNumber(metadata?.callCount ?? metadata?.call_count ?? o.callCount);
  }

  const result: StepAiMetadata = {
    inputTokens: fromUsage.inputTokens ?? fromOutput.inputTokens,
    outputTokens: fromUsage.outputTokens ?? fromOutput.outputTokens,
    totalTokens: fromUsage.totalTokens ?? fromOutput.totalTokens,
    model,
    connectorId: asNonEmptyString(connectorId) ?? outputConnectorId,
    timeToFirstTokenMs: ttft,
    callCount,
  };

  const hasAny =
    result.totalTokens !== undefined ||
    result.inputTokens !== undefined ||
    result.outputTokens !== undefined ||
    result.model !== undefined ||
    result.connectorId !== undefined ||
    result.timeToFirstTokenMs !== undefined;

  return hasAny ? result : undefined;
};

export const stepAiToTokenUsage = (ai: StepAiMetadata): WorkflowTokenUsage | undefined => {
  if (ai.totalTokens === undefined && ai.inputTokens === undefined && ai.outputTokens === undefined) {
    return undefined;
  }
  const inputTokens = ai.inputTokens ?? 0;
  const outputTokens = ai.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: ai.totalTokens ?? inputTokens + outputTokens,
  };
};
