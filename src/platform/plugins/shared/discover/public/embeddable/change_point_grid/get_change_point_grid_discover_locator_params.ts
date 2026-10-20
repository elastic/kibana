/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import {
  convertFiltersToESQLExpression,
  convertQueryToESQLExpression,
  getEsqlControls,
  injectWhereClauseAfterSourceCommand,
} from '@kbn/esql-utils';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { DiscoverAppLocatorParams } from '../../../common';
import type { ChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

/** Builds a Discover location for the query and context the panel is currently showing. */
export const getChangePointGridDiscoverLocatorParams = ({
  esql,
  searchContext,
  parentApi,
}: {
  esql: string;
  searchContext: ChangePointGridSearchRequest;
  parentApi?: unknown;
}): DiscoverAppLocatorParams => {
  const expressions = [
    convertQueryToESQLExpression(searchContext.inputQuery),
    convertFiltersToESQLExpression(searchContext.filters).esqlExpression,
  ].filter((expression) => expression.length > 0);
  const effectiveEsql = expressions.length
    ? injectWhereClauseAfterSourceCommand(esql, expressions.join(' AND '))
    : esql;
  const esqlControls = apiIsPresentationContainer(parentApi)
    ? getEsqlControls(parentApi, { esql: effectiveEsql })
    : undefined;

  return {
    query: { esql: effectiveEsql },
    timeRange: searchContext.timeRange,
    esqlApproximation: searchContext.isApproximate,
    ...(esqlControls && Object.keys(esqlControls).length > 0
      ? {
          esqlControls: esqlControls as ControlPanelsState<OptionsListESQLControlState>,
        }
      : {}),
  };
};
