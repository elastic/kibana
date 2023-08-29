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
  getAggregateQueryMode,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeInterval } from './compute_interval';
const TRANSFORMATIONAL_COMMANDS = ['stats', 'project', 'keep'];

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
  const currentSuggestion = originalSuggestion ?? suggestions.firstSuggestion;
  const suggestionDeps = useRef(getSuggestionDeps({ dataView, query, columns }));

  const histogramSuggestion = useMemo(() => {
    if (
      !currentSuggestion &&
      dataView.isTimeBased() &&
      query &&
      isOfAggregateQueryType(query) &&
      getAggregateQueryMode(query) === 'esql' &&
      timeRange
    ) {
      let queryHasTransformationalCommands = false;
      if ('esql' in query) {
        TRANSFORMATIONAL_COMMANDS.forEach((command: string) => {
          if (query.esql.toLowerCase().includes(command)) {
            queryHasTransformationalCommands = true;
            return;
          }
        });
      }

      if (queryHasTransformationalCommands) return undefined;

      const interval = computeInterval(timeRange, data);
      const language = getAggregateQueryMode(query);
      const histogramQuery = `${query[language]} | eval uniqueName = 1
        | EVAL timestamp=DATE_TRUNC(${interval}, ${dataView.timeFieldName}) | stats rows = count(uniqueName) by timestamp | rename timestamp as \`${dataView.timeFieldName} every ${interval}\``;
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
      const sug = lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? [];
      if (sug.length) {
        return sug[0];
      }
      return undefined;
    }
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
    suggestionUnsupported:
      !currentSuggestion && !histogramSuggestion && isPlainRecord && !dataView.isTimeBased(),
    isOnHistogramMode: Boolean(histogramSuggestion),
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
