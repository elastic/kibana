/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ATTRIBUTE_GEN_AI_CONVERSATION_ID,
  ATTRIBUTE_GEN_AI_OPERATION_NAME,
  ATTRIBUTE_GEN_AI_PROVIDER_NAME,
  ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS,
  ATTRIBUTE_GEN_AI_REQUEST_MODEL,
  ATTRIBUTE_GEN_AI_REQUEST_SEED,
  ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE,
  ATTRIBUTE_GEN_AI_REQUEST_TOP_K,
  ATTRIBUTE_GEN_AI_REQUEST_TOP_P,
  ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS,
  ATTRIBUTE_GEN_AI_RESPONSE_ID,
  ATTRIBUTE_GEN_AI_RESPONSE_MODEL,
  ATTRIBUTE_GEN_AI_SYSTEM,
  ATTRIBUTE_GEN_AI_USAGE_CACHE_WRITE_INPUT_TOKENS,
  ATTRIBUTE_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS,
  ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS,
  ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS,
} from '@kbn/genai-common';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { FieldConfiguration } from '../../../content_framework';
import { ContentFrameworkTable } from '../../../content_framework';
import { FormattedValue } from '../../../content_framework/table/components/formatted_value';

/**
 * Expands a canonical `attributes.gen_ai.*` field name into the three key
 * shapes produced by the different ingest paths:
 *   1. attributes.gen_ai.*  — OTel / EDOT ingest
 *   2. gen_ai.*             — bare OTel (no attributes. prefix)
 *   3. labels.gen_ai_*      — APM Server ingest (dots → underscores)
 * Only fields present on the hit are rendered by ContentFrameworkTable.
 */
const fallbackShapes = (attributeName: string): string[] => {
  const bare = attributeName.replace(/^attributes\./, '');
  return [attributeName, bare, `labels.${bare.replace(/\./g, '_')}`];
};

const PROVIDER_TITLE = i18n.translate(
  'unifiedDocViewer.observability.traces.genAi.details.provider',
  { defaultMessage: 'Provider' }
);

const DETAIL_FIELD_TITLES: Record<string, string> = {
  // Single flat field table (no Summary/Details split) — the former summary
  // fields lead so the most relevant information stays on top.
  [ATTRIBUTE_GEN_AI_OPERATION_NAME]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.operationName',
    { defaultMessage: 'Operation' }
  ),
  [ATTRIBUTE_GEN_AI_REQUEST_MODEL]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.requestModel',
    { defaultMessage: 'Request model' }
  ),
  [ATTRIBUTE_GEN_AI_PROVIDER_NAME]: PROVIDER_TITLE,
  // Deprecated predecessor of gen_ai.provider.name — shown only when the
  // provider field is absent (see getGenAiDetailFieldNames).
  [ATTRIBUTE_GEN_AI_SYSTEM]: PROVIDER_TITLE,
  [ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.inputTokens',
    { defaultMessage: 'Input tokens' }
  ),
  [ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.outputTokens',
    { defaultMessage: 'Output tokens' }
  ),
  // Shown with their share of the input tokens, see buildFieldConfigurations.
  [ATTRIBUTE_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.cacheReadTokens',
    { defaultMessage: 'Cache read tokens' }
  ),
  [ATTRIBUTE_GEN_AI_USAGE_CACHE_WRITE_INPUT_TOKENS]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.cacheWriteTokens',
    { defaultMessage: 'Cache write tokens' }
  ),
  [ATTRIBUTE_GEN_AI_RESPONSE_MODEL]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.responseModel',
    { defaultMessage: 'Response model' }
  ),
  [ATTRIBUTE_GEN_AI_CONVERSATION_ID]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.conversationId',
    { defaultMessage: 'Conversation ID' }
  ),
  [ATTRIBUTE_GEN_AI_RESPONSE_ID]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.responseId',
    { defaultMessage: 'Response ID' }
  ),
  [ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS]: i18n.translate(
    'unifiedDocViewer.observability.traces.genAi.details.finishReasons',
    { defaultMessage: 'Finish reasons' }
  ),
  // Request params keep their raw semantic-convention names, matching the
  // legacy APM GenAI tab.
  [ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE]: 'temperature',
  [ATTRIBUTE_GEN_AI_REQUEST_TOP_P]: 'top_p',
  [ATTRIBUTE_GEN_AI_REQUEST_TOP_K]: 'top_k',
  [ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS]: 'max_tokens',
  [ATTRIBUTE_GEN_AI_REQUEST_SEED]: 'seed',
};

export type GenAiDetailsTableProps = Pick<
  DocViewRenderProps,
  'hit' | 'dataView' | 'textBasedHits' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
>;

/**
 * Resolves each canonical detail attribute to the single field name it is
 * actually stored under on this hit, picking the first present shape in
 * priority order (mirrors `rawValue()` in `get_genai_fields.ts`). A document
 * can carry a value under more than one shape at once (e.g. a derived bare
 * `gen_ai.*` field alongside the mapped `attributes.gen_ai.*` one) — without
 * this de-duplication every present shape would render as its own row.
 */
// Discover records can carry null-valued (or [null]) keys for absent fields —
// mirror the value-aware presence check of `hasGenAiData`.
const hasValue = (value: unknown): boolean =>
  value != null && (!Array.isArray(value) || value.some((element) => element != null));

const CACHE_TOKEN_ATTRIBUTES = [
  ATTRIBUTE_GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS,
  ATTRIBUTE_GEN_AI_USAGE_CACHE_WRITE_INPUT_TOKENS,
];

const toFiniteNumber = (value: unknown): number | undefined => {
  const raw = Array.isArray(value) ? value.find((element) => element != null) : value;
  const parsed = typeof raw === 'string' ? Number(raw) : raw;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The share of the input tokens that were read from, or written to, the prompt cache, as a whole
 * percentage, kept within 1-99 unless it is exactly 0 or 100. Undefined when it cannot be told: the input tokens are missing or zero, or the cache
 * tokens exceed them, which happens when a provider reports them apart from the input tokens
 * instead of as a part of it.
 */
export function getCachePercentage(cacheTokens: unknown, inputTokens: unknown): number | undefined {
  const cache = toFiniteNumber(cacheTokens);
  const input = toFiniteNumber(inputTokens);
  if (cache === undefined || input === undefined || input <= 0 || cache > input) {
    return undefined;
  }
  // 0% and 100% are only shown when exact: a partial share never rounds onto either end.
  if (cache === 0 || cache === input) {
    return cache === 0 ? 0 : 100;
  }
  return Math.min(99, Math.max(1, Math.round((cache / input) * 100)));
}

const FIELD_CONFIGURATIONS: Record<string, FieldConfiguration> = Object.fromEntries(
  Object.entries(DETAIL_FIELD_TITLES).flatMap(([attributeName, title]) =>
    fallbackShapes(attributeName).map((fieldName): [string, FieldConfiguration] => [
      fieldName,
      { title },
    ])
  )
);

const getCachePercentageLabel = (percentage: number): string =>
  i18n.translate('unifiedDocViewer.observability.traces.genAi.details.cachePercentage', {
    defaultMessage: '({percentage}%)',
    values: { percentage },
  });

const withCachePercentage =
  (inputTokens: unknown): FieldConfiguration['formatter'] =>
  (value, formattedValue) => {
    const percentage = getCachePercentage(value, inputTokens);
    return (
      <FormattedValue
        truncate
        value={
          percentage === undefined ? (
            formattedValue
          ) : (
            <>
              {formattedValue} {getCachePercentageLabel(percentage)}
            </>
          )
        }
      />
    );
  };

/**
 * The static titles, with the cache token rows layered on top to also show their percentage of the
 * input tokens: a formatter only sees its own field's value, so it is built from the hit.
 */
function buildFieldConfigurations(
  flattened: Record<string, unknown>
): Record<string, FieldConfiguration> {
  const inputTokens = fallbackShapes(ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS)
    .map((fieldName) => flattened[fieldName])
    .find(hasValue);
  const formatter = withCachePercentage(inputTokens);
  const cacheConfigurations = CACHE_TOKEN_ATTRIBUTES.flatMap((attributeName) =>
    fallbackShapes(attributeName).map((fieldName): [string, FieldConfiguration] => [
      fieldName,
      { title: DETAIL_FIELD_TITLES[attributeName], formatter },
    ])
  );
  return { ...FIELD_CONFIGURATIONS, ...Object.fromEntries(cacheConfigurations) };
}

export function getGenAiDetailFieldNames(flattened: Record<string, unknown>): string[] {
  const isPresent = (attributeName: string) =>
    fallbackShapes(attributeName).find((fieldName) => hasValue(flattened[fieldName]));

  return Object.keys(DETAIL_FIELD_TITLES)
    .filter(
      // gen_ai.system is only the fallback for the provider (mirrors the
      // `provider ?? system` alias in get_genai_fields.ts) — hide it when the
      // provider field is present to avoid two "Provider" rows.
      (attributeName) =>
        attributeName !== ATTRIBUTE_GEN_AI_SYSTEM || !isPresent(ATTRIBUTE_GEN_AI_PROVIDER_NAME)
    )
    .map(isPresent)
    .filter((fieldName): fieldName is string => fieldName != null);
}

/** Returns true when the hit carries at least one GenAI detail field. */
export function hasGenAiDetailFields(flattened: Record<string, unknown>): boolean {
  return getGenAiDetailFieldNames(flattened).length > 0;
}

/**
 * Renders the GenAI Details section as the doc viewer's field table. Field and
 * value hover actions (filter for/out, filter exists, toggle column) appear
 * automatically when the doc viewer callbacks (`filter`, `onAddColumn`,
 * `onRemoveColumn`, `columns`) are provided — i.e. in the Discover document
 * flyout — and stay hidden where they are not (trace waterfall span flyout).
 */
export function GenAiDetailsTable({
  hit,
  dataView,
  textBasedHits,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
}: GenAiDetailsTableProps) {
  const fieldNames = useMemo(() => getGenAiDetailFieldNames(hit.flattened), [hit]);
  const fieldConfigurations = useMemo(
    () => buildFieldConfigurations(hit.flattened),
    [hit.flattened]
  );

  return (
    <ContentFrameworkTable
      id="genAiDetailsTable"
      data-test-subj="unifiedDocViewerObsTracesGenAiDetails"
      fieldNames={fieldNames}
      fieldConfigurations={fieldConfigurations}
      hit={hit}
      dataView={dataView}
      textBasedHits={textBasedHits}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      columns={columns}
    />
  );
}
