/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';

export const useLensSuggestions = ({
  dataView,
  query,
  originalSuggestion,
  isPlainRecord,
  columns,
  lensSuggestionsApi,
  onSuggestionChange,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  originalSuggestion?: Suggestion;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
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
    suggestionUnsupported: !currentSuggestion && !dataView.isTimeBased(),
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
