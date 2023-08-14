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

const roundInterval = (interval: number) => {
  {
    switch (true) {
      case interval <= 500: // <= 0.5s
        return '100 millisecond';
      case interval <= 5000: // <= 5s
        return '1 second';
      case interval <= 7500: // <= 7.5s
        return '5 second';
      case interval <= 15000: // <= 15s
        return '10 second';
      case interval <= 45000: // <= 45s
        return '30 second';
      case interval <= 180000: // <= 3m
        return '1 minute';
      case interval <= 450000: // <= 9m
        return '5 minute';
      case interval <= 1200000: // <= 20m
        return '10 minute';
      case interval <= 2700000: // <= 45m
        return '30 minute';
      case interval <= 7200000: // <= 2h
        return '1 hour';
      case interval <= 21600000: // <= 6h
        return '3 hour';
      case interval <= 86400000: // <= 24h
        return '12 hour';
      case interval <= 604800000: // <= 1w
        return '24 hour';
      case interval <= 1814400000: // <= 3w
        return '1 week';
      case interval < 3628800000: // <  2y
        return '30 day';
      default:
        return '1 year';
    }
  }
};

const computeInterval = (timeRange: TimeRange, data: DataPublicPluginStart): string => {
  const bounds = data.query.timefilter.timefilter.calculateBounds(timeRange!);
  const min = bounds.min!.valueOf();
  const max = bounds.max!.valueOf();
  const interval = (max - min) / 50;
  return roundInterval(interval);
};

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
    timeRange
  ) {
    const language = getAggregateQueryMode(query);
    if (language === 'esql') {
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
      const sug = isPlainRecord
        ? lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? []
        : [];
      if (sug.length) {
        currentSuggestion = sug[0];
        isOnHistogramMode = true;
      }
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
