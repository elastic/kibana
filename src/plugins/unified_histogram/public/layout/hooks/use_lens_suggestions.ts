/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { removeDropCommandsFromESQLQuery } from '@kbn/esql-utils';
import {
  AggregateQuery,
  isOfAggregateQueryType,
  getAggregateQueryMode,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeInterval } from './compute_interval';
import { shouldDisplayHistogram } from '../helpers';

export const useLensSuggestions = ({
  dataView,
  query,
  originalSuggestion,
  isPlainRecord,
  columns,
  data,
  timeRange,
  lensSuggestionsApi,
  onSuggestionChange,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  originalSuggestion?: Suggestion;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
  data: DataPublicPluginStart;
  timeRange?: TimeRange;
  lensSuggestionsApi: LensSuggestionsApi;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
  table?: Datatable;
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
  }, [dataView, columns, query, isPlainRecord, lensSuggestionsApi]);

  const [allSuggestions, setAllSuggestions] = useState(suggestions.allSuggestions);
  const currentSuggestion = originalSuggestion || suggestions.firstSuggestion;

  const suggestionDeps = useRef(getSuggestionDeps({ dataView, query, columns }));
  const histogramQuery = useRef<AggregateQuery | undefined>();
  const histogramSuggestion = useMemo(() => {
    if (
      !currentSuggestion &&
      dataView.isTimeBased() &&
      query &&
      isOfAggregateQueryType(query) &&
      getAggregateQueryMode(query) === 'esql' &&
      timeRange
    ) {
      const isOnHistogramMode = shouldDisplayHistogram(query);
      if (!isOnHistogramMode) return undefined;

      const interval = computeInterval(timeRange, data);
      const language = getAggregateQueryMode(query);
      const safeQuery = removeDropCommandsFromESQLQuery(query[language]);
      const esqlQuery = `${safeQuery} | EVAL timestamp=DATE_TRUNC(${interval}, ${dataView.timeFieldName}) | stats results = count(*) by timestamp | rename timestamp as \`${dataView.timeFieldName} every ${interval}\``;
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
            id: 'results',
            name: 'results',
            meta: {
              type: 'number',
            },
          },
        ] as DatatableColumn[],
        query: {
          esql: esqlQuery,
        },
      };
      const sug = lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? [];
      if (sug.length) {
        histogramQuery.current = { esql: esqlQuery };
        return sug[0];
      }
    }
    histogramQuery.current = undefined;
    return undefined;
  }, [currentSuggestion, dataView, query, timeRange, data, lensSuggestionsApi]);

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
    currentSuggestion: histogramSuggestion ?? currentSuggestion,
    suggestionUnsupported: !currentSuggestion && !histogramSuggestion && isPlainRecord,
    isOnHistogramMode: Boolean(histogramSuggestion),
    histogramQuery: histogramQuery.current ? histogramQuery.current : undefined,
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
