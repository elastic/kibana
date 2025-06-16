/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState, Dispatch, SetStateAction, useCallback, useMemo } from 'react'; // Remove RefObject
import { AggregateQuery } from '@kbn/es-query'; // Added import
import { fixESQLQueryWithVariables } from '@kbn/esql-utils';
import { type ESQLControlVariable } from '@kbn/esql-types';
import { isEqual } from 'lodash';

export interface UseEditorQuerySyncArgs {
  isLoading: boolean;
  initialQueryEsql: string;
  esqlVariables?: ESQLControlVariable[];
  editorIsInline: boolean;
  isEditorMounted: boolean;
  allowQueryCancellation?: boolean;
  onTextLangQuerySubmit: (query: AggregateQuery, controller: AbortController) => void;
  currentAbortController: AbortController;
  setNewAbortController: Dispatch<SetStateAction<AbortController>>;
  onTextLangQueryChange: (query: AggregateQuery) => void;
}

export const useEditorQuerySync = ({
  isLoading,
  initialQueryEsql,
  esqlVariables,
  editorIsInline,
  isEditorMounted, // Add this line
  allowQueryCancellation,
  onTextLangQuerySubmit,
  currentAbortController,
  setNewAbortController,
  onTextLangQueryChange,
}: UseEditorQuerySyncArgs) => {
  const fixedQuery = useMemo(
    () => fixESQLQueryWithVariables(initialQueryEsql, esqlVariables),
    [initialQueryEsql, esqlVariables]
  );
  const [query, setQuery] = useState({
    edited: fixedQuery ?? '',
    editedTs: Date.now(),
    submitted: fixedQuery ?? '',
    isSubmittedTs: isLoading ? Date.now() : undefined,
    isLoading,
    isLoadingTs: isLoading ? Date.now() : undefined,
  });

  useEffect(() => {
    if (isEditorMounted) {
      const isLoadingTs = isLoading && !query.isLoading ? Date.now() : query.isLoadingTs;

      const isLoadingTsNewer =
        isLoadingTs &&
        (!query.editedTs || isLoadingTs > query.editedTs) &&
        (!query.isSubmittedTs || isLoading > query.isSubmittedTs);

      const nextQuery = { ...query };
      if (isLoadingTsNewer) {
        nextQuery.isLoading = isLoading;
        nextQuery.isLoadingTs = isLoadingTs;
      }

      if (query.edited !== fixedQuery && (editorIsInline || isLoadingTsNewer)) {
        nextQuery.edited = fixedQuery;
        nextQuery.submitted = fixedQuery;
      } else {
        nextQuery.isLoadingTs = isLoadingTs;
      }
      if (!isEqual(nextQuery, query)) {
        setQuery(nextQuery);
      }
    }
  }, [fixedQuery, editorIsInline, isEditorMounted, isLoading, query]);

  const handleQuerySubmit = useCallback(() => {
    if (query.isLoading && isLoading && allowQueryCancellation) {
      currentAbortController?.abort();
      setQuery((prevState) => ({
        ...prevState,
        isLoading: false,
        isLoadingTs: undefined,
      }));
    } else {
      const abc = new AbortController();
      setNewAbortController(abc);
      setQuery((prevState) => ({
        ...prevState,
        submitted: query.edited,
        isSubmittedTs: Date.now(),
        isLoading: true,
        isLoadingTs: Date.now(),
      }));
      onTextLangQuerySubmit({ esql: query.edited } as AggregateQuery, abc);
    }
  }, [
    currentAbortController,
    allowQueryCancellation,
    isLoading,
    query.edited,
    query.isLoading,
    onTextLangQuerySubmit,
    setNewAbortController,
  ]);

  const handleQueryUpdate = useCallback(
    (value: string) => {
      if (!editorIsInline) {
        // allows to apply changes to the code when the query is running
        // preventing a race condition in the inline editor mode, when this is not necessary
        // setCode(value);
        setQuery((prevState) => ({ ...prevState, edited: value, editedTs: Date.now() }));
      }
      onTextLangQueryChange({ esql: value } as AggregateQuery);
    },
    [onTextLangQueryChange, setQuery, editorIsInline]
  );

  return {
    handleQuerySubmit,
    handleQueryUpdate,
    isQueryLoading: query.isLoading,
    code: query.edited,
    codeWhenSubmitted: query.submitted,
    fixedQuery,
  };
};
