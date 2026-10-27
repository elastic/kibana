/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import type { IUiSettingsClient } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import {
  DataSourceCategory,
  SolutionType,
  type DataSourceProfileProviderParams,
} from '../../../../profiles';
import { extractIndexPatternFrom } from '../../../extract_index_pattern_from';
import { isSolutionProfileEnabled } from '../../../is_solution_profile_enabled';
import type { LogOverviewContext, LogsDataSourceProfileProvider } from '../profile';

export interface CreateResolveOptions {
  /**
   * Whether or not the sub-profile should resolve in Classic navigation.
   */
  enabledInClassicNav?: boolean;
}

export const createResolve = (
  baseIndexPattern: string,
  uiSettings: IUiSettingsClient,
  { enabledInClassicNav = true }: CreateResolveOptions = {}
): LogsDataSourceProfileProvider['resolve'] => {
  const testIndexPattern = testPatternAgainstAllowedList([
    createRegExpPatternFrom(baseIndexPattern, 'data'),
  ]);

  // Matches the integration's base pattern against the index pattern (data view title or ES|QL FROM
  // target).
  const matchesIndexPattern = (params: DataSourceProfileProviderParams): boolean => {
    const indexPattern = extractIndexPatternFrom(params);
    return Boolean(indexPattern && testIndexPattern(indexPattern));
  };

  // Matches on the index pattern first; if that does not match, every resolved index must belong to
  // this integration, so a source spanning multiple integrations is never claimed.
  const matchesIntegration = (params: DataSourceProfileProviderParams): boolean => {
    if (matchesIndexPattern(params)) {
      return true;
    }

    const matchedIndices = params.dataView?.matchedIndices;
    return Boolean(matchedIndices?.length && matchedIndices.every(testIndexPattern));
  };

  return (params) => {
    const { rootContext } = params;

    // Observability always resolves solution profiles; Classic only when the integration and the
    // opt-out setting both allow it. The matching itself is identical for both.
    const isSupportedNav = enabledInClassicNav
      ? isSolutionProfileEnabled(rootContext, SolutionType.Observability, uiSettings)
      : rootContext.solutionType === SolutionType.Observability;

    if (!isSupportedNav || !matchesIntegration(params)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
        logOverviewContext$: new BehaviorSubject<LogOverviewContext | undefined>(undefined),
      },
    };
  };
};
