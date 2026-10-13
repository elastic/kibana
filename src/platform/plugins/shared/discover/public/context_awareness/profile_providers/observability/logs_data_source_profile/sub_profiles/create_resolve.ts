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
import { DataSourceCategory, SolutionType } from '../../../../profiles';
import { extractIndexPatternFrom } from '../../../extract_index_pattern_from';
import { isSolutionProfilesInClassicEnabled } from '../../../is_solution_profiles_in_classic_enabled';
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

  return (params) => {
    const { solutionType } = params.rootContext;
    const isSupportedSolutionType =
      solutionType === SolutionType.Observability ||
      (enabledInClassicNav &&
        solutionType === SolutionType.Default &&
        isSolutionProfilesInClassicEnabled(uiSettings));

    if (!isSupportedSolutionType) {
      return { isMatch: false };
    }

    const matchedIndices = params.dataView?.matchedIndices;

    if (matchedIndices && matchedIndices.length > 0) {
      // Prefer the concrete resolved indices: every one must belong to this integration, so a data
      // view spanning multiple integrations is never claimed.
      if (!matchedIndices.every(testIndexPattern)) {
        return { isMatch: false };
      }
    } else {
      // Fall back to the raw index pattern when the data view has not resolved any indices.
      const indexPattern = extractIndexPatternFrom(params);

      if (!indexPattern || !testIndexPattern(indexPattern)) {
        return { isMatch: false };
      }
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
