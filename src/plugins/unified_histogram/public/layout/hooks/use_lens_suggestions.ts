/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  AggregateQuery,
  isOfAggregateQueryType,
  Query,
  TimeRange,
  getAggregateQueryMode,
} from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeInterval } from './compute_interval';

export const useLensSuggestions = ({
  dataView,
  query,
  originalSuggestion,
  isPlainRecord,
  columns,
  timeRange,
  data,
  lensSuggestionsApi,
  onSuggestionChange,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  originalSuggestion?: Suggestion;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
  timeRange?: TimeRange;
  data: DataPublicPluginStart;
  lensSuggestionsApi: LensSuggestionsApi;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
}) => {
  const suggestions = useMemo(() => {
    const context = {
      dataViewSpec: dataView?.toSpec(),
      fieldName: '',
      textBasedColumns: columns,
      query: query && isOfAggregateQueryType(query) ? query : undefined,
    };
    const allSuggestions = isPlainRecord
      ? lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? []
      : [];

    const [firstSuggestion] = allSuggestions;

    return { firstSuggestion, allSuggestions };
  }, [dataView, isPlainRecord, lensSuggestionsApi, query, columns]);

  const [allSuggestions, setAllSuggestions] = useState(suggestions.allSuggestions);
  let currentSuggestion = originalSuggestion ?? suggestions.firstSuggestion;
  const suggestionDeps = useRef(getSuggestionDeps({ dataView, query, columns }));
  let isOnHistogramMode = false;

  if (
    !currentSuggestion &&
    dataView.isTimeBased() &&
    query &&
    isOfAggregateQueryType(query) &&
    getAggregateQueryMode(query) === 'esql' &&
    timeRange
  ) {
    const language = getAggregateQueryMode(query);
    const interval = computeInterval(timeRange, data);
    const histogramQuery = `${query[language]} | eval uniqueName = 1
      | EVAL timestamp=DATE_TRUNC(${dataView.timeFieldName}, ${interval}) | stats rows = count(uniqueName) by timestamp | rename timestamp as \`${dataView.timeFieldName} every ${interval}\``;
    const context = {
      dataViewSpec: dataView?.toSpec(),
      fieldName: '',
      textBasedColumns: [
        {
          id: `${dataView.timeFieldName} every ${interval}`,
          name: `${dataView.timeFieldName} every ${interval}`,
          meta: {
            type: 'date',
          },
        },
        {
          id: 'rows',
          name: 'rows',
          meta: {
            type: 'number',
          },
        },
      ] as DatatableColumn[],
      query: {
        esql: histogramQuery,
      },
    };
    const sug = isPlainRecord ? lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? [] : [];
    if (sug.length) {
      currentSuggestion = sug[0];
      isOnHistogramMode = true;
    }
  }

  useEffect(() => {
    const newSuggestionsDeps = getSuggestionDeps({ dataView, query, columns });

    if (!isEqual(suggestionDeps.current, newSuggestionsDeps)) {
      setAllSuggestions(suggestions.allSuggestions);
      onSuggestionChange?.(suggestions.firstSuggestion);

      suggestionDeps.current = newSuggestionsDeps;
    }
  }, [
    columns,
    dataView,
    onSuggestionChange,
    query,
    suggestions.firstSuggestion,
    suggestions.allSuggestions,
  ]);

  return {
    allSuggestions,
    currentSuggestion,
    suggestionUnsupported: isPlainRecord && !currentSuggestion,
    isOnHistogramMode,
  };
};

const getSuggestionDeps = ({
  dataView,
  query,
  columns,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  columns?: DatatableColumn[];
}) => [dataView.id, columns, query];
