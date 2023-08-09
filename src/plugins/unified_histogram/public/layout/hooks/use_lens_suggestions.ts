/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DataView } from '@kbn/data-views-plugin/common';
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

const computeMaxBuckets = (timeRange: TimeRange, maxBars: number): number => {
  const duration = moment.duration(moment(timeRange.to).diff(moment(timeRange.from)), 'ms');
  const maxBucketCount = duration.asMilliseconds() / 10000;
  return Math.min(Math.max(Math.round(maxBucketCount), 10), maxBars);
};

export const useLensSuggestions = ({
  dataView,
  uiSettings,
  query,
  originalSuggestion,
  isPlainRecord,
  columns,
  timeRange,
  lensSuggestionsApi,
  onSuggestionChange,
}: {
  dataView: DataView;
  uiSettings: IUiSettingsClient;
  query?: Query | AggregateQuery;
  originalSuggestion?: Suggestion;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
  timeRange?: TimeRange;
  lensSuggestionsApi: LensSuggestionsApi;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
}) => {
  const maxBars = useMemo(() => uiSettings.get('histogram:maxBars'), [uiSettings]);

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

  if (
    !currentSuggestion &&
    dataView.isTimeBased() &&
    query &&
    isOfAggregateQueryType(query) &&
    timeRange
  ) {
    const maxBuckets = computeMaxBuckets(timeRange, maxBars);
    const language = getAggregateQueryMode(query);
    if (language === 'esql') {
      const histogramQuery = `${query[language]} | eval uniqueName = 1
      | EVAL timestamp=AUTO_BUCKET(${dataView.timeFieldName}, ${maxBuckets}, "${timeRange.from}", "${timeRange.to}") | stats rows = count(uniqueName) by timestamp`;
      const context = {
        dataViewSpec: dataView?.toSpec(),
        fieldName: '',
        textBasedColumns: [
          {
            id: 'timestamp',
            name: 'timestamp',
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
      }
    }
    // const histogramQuery = `${query[language]} | eval uniqueName = 1 | stats countAll = count(uniqueName) by ${dataView.timeFieldName}`;
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
