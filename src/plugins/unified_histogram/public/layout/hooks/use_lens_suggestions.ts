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
  cleanupESQLQueryForLensSuggestions,
  Query,
  TimeRange,
} from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeInterval } from './compute_interval';
import type { ExternalVisContext } from '../../types';
import { isSuggestionAndVisContextCompatible } from '../../utils/external_vis_context';

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
  externalVisContext,
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
  externalVisContext?: ExternalVisContext;
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

  if (externalVisContext) {
    const matchingSuggestion = suggestions.allSuggestions.find((suggestion) =>
      isSuggestionAndVisContextCompatible(suggestion, externalVisContext)
    );

    currentSuggestion = matchingSuggestion || currentSuggestion;
  }

  console.log(
    'use_lens_suggestion',
    'selected suggestion',
    currentSuggestion,
    'current vis context',
    externalVisContext?.attributes
  );

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
      const safeQuery = cleanupESQLQueryForLensSuggestions(query[language]);
      const esqlQuery = `${safeQuery} | EVAL timestamp=DATE_TRUNC(${interval}, ${dataView.timeFieldName}) | stats results = count(*) by timestamp | rename timestamp as \`${dataView.timeFieldName}\``;
      const context = {
        dataViewSpec: dataView?.toSpec(),
        fieldName: '',
        textBasedColumns: [
          {
            id: dataView.timeFieldName,
            name: dataView.timeFieldName,
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
      console.log('deps change triggers a new suggestion');
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

  if (histogramSuggestion) {
    console.log('using histogram suggestion');
  }

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
