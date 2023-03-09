/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
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
  columns?: string[];
  lensSuggestionsApi: LensSuggestionsApi;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
}) => {
  const suggestions = useMemo(() => {
    const context = {
      dataViewSpec: dataView?.toSpec(),
      fieldName: '',
      contextualFields: columns,
      query: query && isOfAggregateQueryType(query) ? query : undefined,
    };
    const lensSuggestions = isPlainRecord ? lensSuggestionsApi(context, dataView) : undefined;
    const firstSuggestion = lensSuggestions?.length ? lensSuggestions[0] : undefined;
    const restSuggestions = lensSuggestions?.filter((sug) => {
      return !sug.hide && sug.visualizationId !== 'lnsLegacyMetric';
    });
    const firstSuggestionExists = restSuggestions?.find(
      (sug) => sug.title === firstSuggestion?.title
    );
    if (firstSuggestion && !firstSuggestionExists) {
      restSuggestions?.push(firstSuggestion);
    }
    return { firstSuggestion, restSuggestions };
  }, [columns, dataView, isPlainRecord, lensSuggestionsApi, query]);

  const [allSuggestions, setAllSuggestions] = useState(suggestions.restSuggestions);
  const currentSuggestion = originalSuggestion ?? suggestions.firstSuggestion;
  const suggestionDeps = useRef(getSuggestionDeps({ dataView, query, columns }));

  useEffect(() => {
    const newSuggestionsDeps = getSuggestionDeps({ dataView, query, columns });

    if (!isEqual(suggestionDeps.current, newSuggestionsDeps)) {
      setAllSuggestions(suggestions.restSuggestions);
      onSuggestionChange?.(suggestions.firstSuggestion);

      suggestionDeps.current = newSuggestionsDeps;
    }
  }, [
    columns,
    dataView,
    onSuggestionChange,
    query,
    suggestions.firstSuggestion,
    suggestions.restSuggestions,
  ]);

  return {
    allSuggestions,
    currentSuggestion,
    suggestionUnsupported:
      isPlainRecord &&
      (!currentSuggestion || currentSuggestion?.visualizationId === 'lnsDatatable'),
  };
};

const getSuggestionDeps = ({
  dataView,
  query,
  columns,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  columns?: string[];
}) => [dataView.id, columns, query];
