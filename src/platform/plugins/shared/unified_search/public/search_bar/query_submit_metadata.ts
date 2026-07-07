/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import { QuerySource, type TelemetryQuerySubmittedProps } from '@kbn/esql-types';

export enum QuerySubmitTrigger {
  QUERY_BAR_SUBMIT = 'query_bar_submit',
  TEXT_BASED_EDITOR = 'text_based_editor',
  TIME_FILTER = 'time_filter',
}

export interface QuerySubmitMetadata {
  trigger: QuerySubmitTrigger;
}

/**
 * Maps a search bar submit to the `esql.query_submitted` telemetry payload, or `undefined` when the
 * submit should not be tracked from here. Only ES|QL (aggregate) queries are tracked, and only for
 * submits that originate outside the ES|QL editor.
 *
 * Editor-internal submits (`QuerySubmitTrigger.TEXT_BASED_EDITOR`) are intentionally excluded: the
 * ES|QL editor (@kbn/esql-editor) already emits its own `esql.query_submitted` event for those (with
 * sources like MANUAL, QUICK_SEARCH, HISTORY, etc.), so tracking them here would double-count.
 */
export const getESQLQuerySubmittedTelemetry = (
  query: Query | AggregateQuery | undefined,
  metadata?: QuerySubmitMetadata
): TelemetryQuerySubmittedProps | undefined => {
  if (!query || !isOfAggregateQueryType(query)) {
    return;
  }

  switch (metadata?.trigger) {
    case QuerySubmitTrigger.QUERY_BAR_SUBMIT:
      return { source: QuerySource.SEARCH_BUTTON, query: query.esql };
    case QuerySubmitTrigger.TIME_FILTER:
      return { source: QuerySource.TIME_FILTER, query: query.esql };
    default:
      return;
  }
};
