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
    external: fixedQuery,
    edited: '',
    submitted: '',
    isLoading,
    isLoadingExternal: isLoading,
  });

  useEffect(() => {
    if (isEditorMounted) {
      setQuery((prevState) => {
        const externalQueryChanged = fixedQuery !== prevState.external;
        const externalIsLoadingChanged = isLoading !== prevState.isLoadingExternal;
        const queryChanged = fixedQuery !== prevState.edited;

        const nextQuery = {
          ...prevState,
          external: fixedQuery,
          isLoadingExternal: isLoading,
          edited: prevState.edited === fixedQuery ? '' : prevState.edited,
        };

        if (externalIsLoadingChanged) {
          nextQuery.isLoading = isLoading;
        }

        if (
          queryChanged &&
          (editorIsInline ||
            nextQuery.edited === '' ||
            (externalQueryChanged && !prevState.isLoading))
        ) {
          nextQuery.edited = '';
        }

        return nextQuery;
      });
    }
  }, [fixedQuery, editorIsInline, isEditorMounted, isLoading]);

  const handleQuerySubmit = useCallback(() => {
    if (query.isLoading && isLoading && allowQueryCancellation) {
      currentAbortController?.abort();
      setQuery((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    } else {
      const abc = new AbortController();
      setNewAbortController(abc);
      setQuery((prevState) => ({
        ...prevState,
        submitted: query.edited || fixedQuery,
        isLoading: true,
      }));
      onTextLangQuerySubmit({ esql: query.edited || fixedQuery } as AggregateQuery, abc);
    }
  }, [
    currentAbortController,
    allowQueryCancellation,
    isLoading,
    query.edited,
    query.isLoading,
    onTextLangQuerySubmit,
    setNewAbortController,
    fixedQuery,
  ]);

  const handleQueryUpdate = useCallback(
    (value: string) => {
      if (!editorIsInline) {
        // allows to apply changes to the code when the query is running
        // preventing a race condition in the inline editor mode, when this is not necessary
        // setCode(value);
        setQuery((prevState) => ({ ...prevState, edited: value === fixedQuery ? '' : value }));
      }
      onTextLangQueryChange({ esql: value } as AggregateQuery);
    },
    [onTextLangQueryChange, setQuery, editorIsInline, fixedQuery]
  );

  return {
    handleQuerySubmit,
    handleQueryUpdate,
    isQueryLoading: query.isLoading,
    code: query.edited || fixedQuery,
    codeWhenSubmitted: query.submitted || fixedQuery,
    fixedQuery,
  };
};
