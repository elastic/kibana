/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StartServicesAccessor } from '@kbn/core/public';
import { EventAnnotationPluginStart, EventAnnotationStartDependencies } from '../plugin';

import {
  FetchEventAnnotationsExpressionFunctionDefinition,
  FetchEventAnnotationsStartDependencies,
  getFetchEventAnnotationsMeta,
  requestEventAnnotations,
} from '../../common/fetch_event_annotations';

export function fetchEventAnnotations({
  getStartDependencies,
}: {
  getStartDependencies: () => Promise<FetchEventAnnotationsStartDependencies>;
}): FetchEventAnnotationsExpressionFunctionDefinition {
  return {
    ...getFetchEventAnnotationsMeta(),
    fn: (input, args, context) => {
      return requestEventAnnotations(input, args, context, getStartDependencies);
    },
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
        dataViews,
        getNow: () => nowProvider.get(),
        uiSettings,
      };
    },
  });
}
