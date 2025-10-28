/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { Parser } from '@kbn/esql-ast';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { METRICS_EXPERIENCE_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createChartSection } from './accessor/chart_section';

export type MetricsExperienceDataSourceProfileProvider = DataSourceProfileProvider<{}>;

export const METRICS_DATA_SOURCE_PROFILE_ID = 'metrics-data-source-profile';
// FIXME: could kbn-esql-ast provide a union type with existing commands?
const SUPPORTED_ESQL_COMMANDS = new Set(['from', 'ts', 'limit', 'sort']);
export const createMetricsDataSourceProfileProvider = (
  services: ProfileProviderServices
): MetricsExperienceDataSourceProfileProvider => ({
  profileId: METRICS_DATA_SOURCE_PROFILE_ID,
  restrictedToProductFeature: METRICS_EXPERIENCE_PRODUCT_FEATURE_ID,
  profile: {
    getChartSectionConfiguration: createChartSection(
      services.metricsContextService.getMetricsExperienceClient()
    ),
  },
  resolve: async ({ query, rootContext }) => {
    const metricsClient = services.metricsContextService.getMetricsExperienceClient();
    if (!metricsClient || !isQuerySupported(query) || !isSolutionValid(rootContext.solutionType)) {
      return { isMatch: false };
    }

    const indexPattern = getIndexPatternFromESQLQuery(query.esql);
    if (!services.metricsContextService.isMetricsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    const timeRange = getTimeRange();
    const { indexPatternMetadata } = await metricsClient.getIndexPatternMetadata({
      indexPattern,
      from: timeRange.from.toISOString(),
      to: timeRange.to.toISOString(),
    });

    return {
      isMatch: Object.values(indexPatternMetadata).some((meta) => meta.hasTimeSeriesFields),
      context: {
        category: DataSourceCategory.Metrics,
      },
    };
  },
});

function getTimeRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 15 * 60 * 1000); // 15 minutes
  return { from, to };
}

function isSolutionValid(solutionType: SolutionType) {
  return [
    SolutionType.Observability,
    SolutionType.Security,
    SolutionType.Search,
    SolutionType.Default,
  ].includes(solutionType);
}

function isQuerySupported(query: AggregateQuery | Query | undefined): query is AggregateQuery {
  if (!isOfAggregateQueryType(query)) {
    return false;
  }

  const parsed = Parser.parse(query.esql);
  return parsed.root.commands.every((c) => SUPPORTED_ESQL_COMMANDS.has(c.name));
}
