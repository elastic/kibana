/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSingleSource } from '@kbn/esql-utils';
import {
  EXEMPLARS_INDEX_PREFIX,
  EXEMPLARS_OTEL_DATASET_MARKER,
  METRICS_INDEX_PREFIX,
} from '../../constants';
import type { ParsedMetricItem } from '../../../types';

// Wildcards, comma lists, cross-cluster prefixes (`remote:idx`), source selectors
// (`idx::failures`) and whitespace: none of these name one concrete data stream.
const NON_CONCRETE_SOURCE_CHARS = ['*', ',', ':', ' ', '\t', '\n', '\r'];

const isConcreteSource = (metricsIndex: string): boolean =>
  !NON_CONCRETE_SOURCE_CHARS.some((char) => metricsIndex.includes(char));

/**
 * Maps an OTel metrics data stream onto its parallel exemplars data stream, or returns
 * `undefined` when no such stream can exist. Callers treat `undefined` as "do not fetch".
 */
export const deriveExemplarsIndex = (metricsIndex: string): string | undefined => {
  if (!metricsIndex.startsWith(METRICS_INDEX_PREFIX) || !isConcreteSource(metricsIndex)) {
    return undefined;
  }

  const suffix = metricsIndex.slice(METRICS_INDEX_PREFIX.length);
  const namespaceSeparatorIndex = suffix.indexOf('-');

  // Without a namespace the derived name cannot match the `exemplars-*.otel-*` template.
  if (namespaceSeparatorIndex <= 0 || namespaceSeparatorIndex === suffix.length - 1) {
    return undefined;
  }

  const dataset = suffix.slice(0, namespaceSeparatorIndex);
  if (!dataset.endsWith(EXEMPLARS_OTEL_DATASET_MARKER)) {
    return undefined;
  }

  return `${EXEMPLARS_INDEX_PREFIX}${suffix}`;
};

/**
 * The exemplars stream for a metric chart. A concrete source the user typed wins over the
 * metric's own index, matching how the chart query itself is scoped.
 */
export const resolveExemplarsIndex = (
  { indexName }: Pick<ParsedMetricItem, 'indexName'>,
  originalSource?: string
): string | undefined =>
  deriveExemplarsIndex(isSingleSource(originalSource) ? originalSource : indexName);
