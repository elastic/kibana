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

export interface MetricsContextService {
  getAllMetricsIndexPattern(): string;
  isMetricsIndexPattern(indexPattern: unknown): boolean;
  containsMetricsIndexPattern(indexPattern: unknown): boolean;
}

export interface MetricsContextServiceDeps {
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

export const DEFAULT_ALLOWED_METRICS_BASE_PATTERNS = ['metrics', 'metricbeat'];

export const DEFAULT_ALLOWED_METRICS_BASE_PATTERNS_REGEXP = createRegExpPatternFrom(
  DEFAULT_ALLOWED_METRICS_BASE_PATTERNS,
  'data'
);

export const createMetricsContextService = async ({
  apmSourcesAccess,
}: MetricsContextServiceDeps): Promise<MetricsContextService> => {
  if (!apmSourcesAccess) {
    return defaultMetricsContextService;
  }

  try {
    const indices = await apmSourcesAccess.getApmIndices();

    if (!indices) {
      return defaultMetricsContextService;
    }

    const { transaction, span } = indices;
    const allIndices = getAllIndices(transaction, span);
    const uniqueIndices = Array.from(new Set(allIndices));

    const metrics = uniqueIndices.join();
    const allowedDataSources = [createRegExpPatternFrom(uniqueIndices, 'data')];

    return getMetricsContextService(metrics, allowedDataSources);
  } catch (error) {
    return defaultMetricsContextService;
  }
};

function getAllIndices(transaction: string, span: string) {
  return [transaction, span]
    .flatMap((index) => index.split(','))
    .concat(DEFAULT_ALLOWED_METRICS_BASE_PATTERNS);
}

export const getMetricsContextService = (metrics: string, allowedDataSources: RegExp[]) => ({
  getAllMetricsIndexPattern: () => metrics,
  isMetricsIndexPattern: testPatternAgainstAllowedList(allowedDataSources),
  containsMetricsIndexPattern: containsIndexPattern(allowedDataSources),
});

const defaultMetricsContextService = getMetricsContextService(
  DEFAULT_ALLOWED_METRICS_BASE_PATTERNS.join(),
  [DEFAULT_ALLOWED_METRICS_BASE_PATTERNS_REGEXP]
);
