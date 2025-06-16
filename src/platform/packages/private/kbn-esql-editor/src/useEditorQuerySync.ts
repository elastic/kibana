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
  const fixedQueryObj = useMemo(
    () => ({
      changed: Date.now(),
      query: fixESQLQueryWithVariables(initialQueryEsql, esqlVariables),
    }),
    [initialQueryEsql, esqlVariables]
  );
  const isLoadingObj = useMemo(
    () => ({
      changed: Date.now(),
      isLoading,
    }),
    [isLoading]
  );
  const { query: fixedQuery } = fixedQueryObj;
  const [query, setQuery] = useState({
    edited: fixedQuery ?? '',
    editedTs: Date.now(),
    submitted: fixedQuery ?? '',
    isLoading,
    isLoadingChanged: isLoadingObj.changed,
  });

  useEffect(() => {
    if (isEditorMounted) {
      const nextQuery = { ...query };

      if (
        query.edited !== fixedQuery &&
        (editorIsInline || fixedQueryObj.changed >= query.editedTs)
      ) {
        nextQuery.edited = fixedQuery;
        nextQuery.editedTs = fixedQueryObj.changed;
      }
      if (isLoadingObj.changed >= query.isLoadingChanged) {
        nextQuery.isLoading = isLoading;
        nextQuery.isLoadingChanged = isLoadingObj.changed;
      }
      const applyChange = !isEqual(nextQuery, query);

      if (applyChange) {
        setQuery(nextQuery);
      }
    }
  }, [
    fixedQuery,
    editorIsInline,
    isEditorMounted,
    isLoading,
    query,
    fixedQueryObj.changed,
    isLoadingObj.changed,
  ]);

  const handleQuerySubmit = useCallback(() => {
    if (query.isLoading && isLoading && allowQueryCancellation) {
      currentAbortController?.abort();
      setQuery((prevState) => ({
        ...prevState,
        isLoading: false,
        isLoadingChanged: Date.now(),
      }));
    } else {
      const abc = new AbortController();
      setNewAbortController(abc);
      setQuery((prevState) => ({
        ...prevState,
        submitted: query.edited,
        isLoading: true,
        isLoadingChanged: Date.now(),
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
