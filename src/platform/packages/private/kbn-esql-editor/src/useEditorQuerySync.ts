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
  initialQueryEsql: string; // New: for query.esql
  esqlVariables?: ESQLControlVariable[]; // New: for esqlVariables
  editorIsInline?: boolean;
  isEditorMounted: boolean; // Add this line
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
    isLoading,
    isLoadingTs: isLoading ? Date.now() : undefined,
  });

  useEffect(() => {
    if (isEditorMounted) {
      const isLoadingTs = isLoading && !query.isLoading ? Date.now() : query.isLoadingTs;
      const nextQuery = {
        ...query,
        isLoading,
      };
      if (
        query.edited !== fixedQuery &&
        (editorIsInline || (isLoadingTs && isLoadingTs > query.editedTs))
      ) {
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
    if (query.isLoading && allowQueryCancellation) {
      currentAbortController.abort();
      const newController = new AbortController();
      setNewAbortController(newController);
      onTextLangQuerySubmit({ esql: query.edited }, newController); // Removed language property
      setQuery((prevState) => ({
        ...prevState,
        submitted: query.edited,
        isLoading: true,
        isLoadingTs: Date.now(),
      }));
    } else if (!query.isLoading) {
      onTextLangQuerySubmit({ esql: query.edited }, currentAbortController); // Removed language property
      setQuery((prevState) => ({
        ...prevState,
        submitted: query.edited,
        isLoading: true,
        isLoadingTs: Date.now(),
      }));
    }
  }, [
    allowQueryCancellation,
    currentAbortController,
    setNewAbortController,
    onTextLangQuerySubmit,
    query.edited,
    query.isLoading,
  ]);

  const handleQueryUpdate = useCallback(
    (value: string) => {
      if (!editorIsInline) {
        // allows to apply changes to the code when the query is running
        // preventing a race condition in the inline editor mode, when this is not necerray
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
