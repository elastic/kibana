/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SolutionId } from '@kbn/core-chrome-browser';

// Define ES|QL plugin interface locally to match the plugin implementation
export interface ESQLExtensionsRegistry {
  setRecommendedQueries(
    queries: Array<{
      name: string;
      query: string;
      description?: string;
    }>,
    solutionId: string
  ): void;
}

export interface ESQLSetup {
  getExtensionsRegistry(): ESQLExtensionsRegistry;
}

const METRICS_INDEX_PATTERN = 'metrics-*';
const solutions: SolutionId[] = ['security', 'oblt', 'es'];

const METRICS_EXPERIENCE_ESQL_RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.metricsExperience.esqlQueries.allMetrics.name', {
      defaultMessage: 'All metrics',
    }),
    query: `FROM ${METRICS_INDEX_PATTERN}`,
    description: i18n.translate('xpack.metricsExperience.esqlQueries.allMetrics.description', {
      defaultMessage: 'Loads all available metrics',
    }),
  },
];

export function setEsqlRecommendedQueries(esqlPlugin: ESQLSetup) {
  const esqlExtensionsRegistry = esqlPlugin.getExtensionsRegistry();

  solutions.forEach((solutionId) => {
    esqlExtensionsRegistry.setRecommendedQueries(
      [...METRICS_EXPERIENCE_ESQL_RECOMMENDED_QUERIES],
      solutionId
    );
  });
}
