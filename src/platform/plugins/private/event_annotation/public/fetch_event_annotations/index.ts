/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, switchMap } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { EventAnnotationPluginStart, EventAnnotationStartDependencies } from '../plugin';

import type {
  FetchEventAnnotationsExpressionFunctionDefinition,
  FetchEventAnnotationsStartDependencies,
} from '../../common/fetch_event_annotations';
import { getFetchEventAnnotationsMeta } from '../../common/fetch_event_annotations';

export function fetchEventAnnotations({
  getStartDependencies,
}: {
  getStartDependencies: () => Promise<FetchEventAnnotationsStartDependencies>;
}): FetchEventAnnotationsExpressionFunctionDefinition {
  return {
    ...getFetchEventAnnotationsMeta(),
    // Async chunk: the request logic is only needed when a chart renders annotations.
    fn: (input, args, context) =>
      from(import('../../common/fetch_event_annotations/request_event_annotations')).pipe(
        switchMap(({ requestEventAnnotations }) =>
          requestEventAnnotations(input, args, context, getStartDependencies)
        )
      ),
  };
}

export function getFetchEventAnnotations({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<
    EventAnnotationStartDependencies,
    EventAnnotationPluginStart
  >;
}) {
  return fetchEventAnnotations({
    getStartDependencies: async () => {
      const [
        { uiSettings },
        {
          data: { search, dataViews, nowProvider },
        },
      ] = await getStartServices();
      return {
        aggs: search.aggs,
        searchSource: search.searchSource,
        esql: search.esql,
        dataViews,
        getNow: () => nowProvider.get(),
        uiSettings,
      };
    },
  });
}
