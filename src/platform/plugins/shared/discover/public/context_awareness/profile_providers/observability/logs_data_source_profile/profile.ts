/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import type { DataSourceContext, DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  getCellRenderers,
  getRowIndicatorProvider,
  getRowAdditionalLeadingControls,
  createGetDefaultAppState,
  getPaginationConfig,
  getColumnsConfiguration,
  createRecommendedFields,
  getDeepAnalysisPlaybook,
} from './accessors';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export type LogOverViewAccordionExpandedValue = 'stacktrace' | 'quality_issues' | undefined;

// Mirrors @kbn/logs-data-access-plugin DEFAULT_LOG_SOURCES (the observability:logSources defaults).
// Duplicated because that value isn't exported from the plugin's `public` entry and @kbn/imports
// forbids importing plugin `common` values across plugins.
export const EXCLUDED_LOG_SOURCES_FOR_DEFAULT_DISCOVER = ['logs*', '-logstash*', 'filebeat-*'];

export interface LogOverviewContext {
  recordId: string;
  initialAccordionSection: LogOverViewAccordionExpandedValue;
}

export interface LogsDataSourceContext {
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
}

export type LogsDataSourceProfileProvider = DataSourceProfileProvider<LogsDataSourceContext>;

const LOGS_DATA_SOURCE_PROFILE_ID = 'observability-logs-data-source-profile';

export const isLogsDataSourceContext = (
  dataSourceContext: DataSourceContext
): dataSourceContext is DataSourceContext & LogsDataSourceContext =>
  dataSourceContext.category === DataSourceCategory.Logs &&
  'logOverviewContext$' in dataSourceContext &&
  dataSourceContext.logOverviewContext$ instanceof BehaviorSubject;

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): LogsDataSourceProfileProvider => ({
  profileId: LOGS_DATA_SOURCE_PROFILE_ID,
  profile: {
    getDefaultAppState: createGetDefaultAppState(),
    getCellRenderers,
    getRowIndicatorProvider,
    getRowAdditionalLeadingControls,
    getPaginationConfig,
    getColumnsConfiguration,
    getRecommendedFields: createRecommendedFields({}),
    getDeepAnalysisPlaybook,
  },
  resolve: (params) => {
    if (
      params.rootContext.solutionType !== SolutionType.Observability &&
      params.rootContext.solutionType !== SolutionType.Default
    ) {
      return { isMatch: false };
    }

    const indexPattern = extractIndexPatternFrom(params);

    // Only match in Default Discover if the index pattern is in the configured log sources, observability:logSources setting.
    // But excludes the default values of the setting as they are too generic.
    if (params.rootContext.solutionType === SolutionType.Default && indexPattern) {
      const logsSourcesPatternsFromSetting =
        services.logsContextService.getAllLogsIndexPattern() ?? '';
      const logsSourcesPatterns = logsSourcesPatternsFromSetting
        .split(',')
        .filter((pattern) => !EXCLUDED_LOG_SOURCES_FOR_DEFAULT_DISCOVER.includes(pattern));
      const isMatch = testPatternAgainstAllowedList(logsSourcesPatterns)(indexPattern);
      if (!isMatch) {
        return { isMatch: false };
      }
    }

    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
        logOverviewContext$: new BehaviorSubject<LogOverviewContext | undefined>(undefined),
      },
    };
  },
});
