/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { containsIndexPattern } from '../../utils';

export interface TracesContextService {
  getAllTracesIndexPattern(): string;
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

export const createTracesContextService = async ({
  apmSourcesAccess,
}: TracesContextServiceDeps): Promise<TracesContextService> => {
  if (!apmSourcesAccess) {
    return defaultTracesContextService;
  }

  try {
    const indices = await apmSourcesAccess.getApmIndices();

    if (!indices) {
      return defaultTracesContextService;
    }

    const { transaction, span } = indices;
    const allIndices = getAllIndices(transaction, span);
    const uniqueIndices = Array.from(new Set(allIndices));

    const traces = uniqueIndices.join();
    const allowedDataSources = [createRegExpPatternFrom(uniqueIndices, 'data')];

    return getTracesContextService(traces, allowedDataSources);
  } catch (error) {
    return defaultTracesContextService;
  }
};

function getAllIndices(transaction: string, span: string) {
  return [transaction, span]
    .flatMap((index) => index.split(','))
    .concat(DEFAULT_ALLOWED_TRACES_BASE_PATTERNS);
}

export const getTracesContextService = (traces: string, allowedDataSources: RegExp[]) => ({
  getAllTracesIndexPattern: () => traces,
  isTracesIndexPattern: testPatternAgainstAllowedList(allowedDataSources),
  containsTracesIndexPattern: containsIndexPattern(allowedDataSources),
});

const defaultTracesContextService = getTracesContextService(
  DEFAULT_ALLOWED_TRACES_BASE_PATTERNS.join(),
  [DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP]
);
