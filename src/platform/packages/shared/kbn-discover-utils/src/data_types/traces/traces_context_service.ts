/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { APMIndices, ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { containsIndexPattern } from '../../utils';

export interface TracesContextService {
  getAllTracesIndexPattern(): string | undefined;
  isTracesIndexPattern(indexPattern: unknown): boolean;
  containsTracesIndexPattern(indexPattern: unknown): boolean;
}

export interface TracesContextServiceDeps {
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

export const DEFAULT_ALLOWED_TRACES_BASE_PATTERNS = ['trace', 'traces'];

export const DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP = createRegExpPatternFrom(
  DEFAULT_ALLOWED_TRACES_BASE_PATTERNS,
  'data'
);

export const createTracesContextService = ({
  indices,
}: {
  indices: APMIndices | null;
}): TracesContextService => {
  if (!indices) {
    return defaultTracesContextService;
  }

  const { transaction, span } = indices;
  const allTraceIndices = getAllIndices(transaction, span);
  const tracesIndexPattern = allTraceIndices.join();

  // Allow:
  // - each individual configured traces index pattern (e.g. `traces-apm*`)
  // - the full combined list (e.g. `traces-apm*,apm-*,traces-*.otel-*`)
  // - generic `trace|traces` base patterns (fallback)
  const allowedDataSources = [
    tracesIndexPattern,
    ...allTraceIndices,
    DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP,
  ];

  return getTracesContextService({ tracesIndexPattern, allowedDataSources });
};

function getAllIndices(transaction: string, span: string) {
  return Array.from(new Set([transaction, span].flatMap((index) => index.split(','))));
}

export const getTracesContextService = ({
  tracesIndexPattern,
  allowedDataSources,
}: {
  tracesIndexPattern?: string;
  allowedDataSources: Array<string | RegExp>;
}) => ({
  getAllTracesIndexPattern: () => tracesIndexPattern,
  isTracesIndexPattern: testPatternAgainstAllowedList(allowedDataSources),
  containsTracesIndexPattern: containsIndexPattern(allowedDataSources),
});

const defaultTracesContextService = getTracesContextService({
  tracesIndexPattern: undefined,
  allowedDataSources: [DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP],
});
