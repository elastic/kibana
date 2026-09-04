/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { QuerySource } from '@kbn/esql-types';
import type { EsqlEditorActions } from '../editor_actions_context';
import type { EsqlStarredQueriesService } from '../editor_footer/esql_starred_queries_service';

interface UseEsqlEditorActionsParams {
  code: string;
  isHistoryOpen: boolean;
  isLanguageComponentOpen: boolean;
  isCurrentQueryStarred: boolean;
  editorIsInline: boolean;
  onUpdateAndSubmitQuery: (newQuery: string, source: QuerySource) => void;
  starredQueriesService: EsqlStarredQueriesService | null;
  trimmedQuery: string;
  setIsHistoryOpen: (value: boolean) => void;
  setIsLanguageComponentOpen: (value: boolean) => void;
  setIsCurrentQueryStarred: (value: boolean) => void;
  trackQueryHistoryOpened: (isOpen: boolean) => void;
  isVisorOpenRef: MutableRefObject<boolean>;
  setIsVisorOpen: (value: boolean) => void;
}

export function useEsqlEditorActions({
  code,
  isHistoryOpen,
  isLanguageComponentOpen,
  isCurrentQueryStarred,
  editorIsInline,
  onUpdateAndSubmitQuery,
  starredQueriesService,
  trimmedQuery,
  setIsHistoryOpen,
  setIsLanguageComponentOpen,
  setIsCurrentQueryStarred,
  trackQueryHistoryOpened,
  isVisorOpenRef,
  setIsVisorOpen,
}: UseEsqlEditorActionsParams): {
  editorActions: EsqlEditorActions;
  onClickQueryHistory: (isOpen: boolean) => void;
} {
  const onToggleVisor = useCallback(() => {
    setIsVisorOpen(!isVisorOpenRef.current);
  }, [isVisorOpenRef, setIsVisorOpen]);

  const onClickQueryHistory = useCallback(
    (isOpen: boolean) => {
      trackQueryHistoryOpened(isOpen);
      setIsHistoryOpen(isOpen);
    },
    [setIsHistoryOpen, trackQueryHistoryOpened]
  );

  const onToggleHistory = useCallback(() => {
    onClickQueryHistory(!isHistoryOpen);
  }, [isHistoryOpen, onClickQueryHistory]);

  const onToggleLanguageComponent = useCallback(() => {
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsHistoryOpen(false);
  }, [isLanguageComponentOpen, setIsHistoryOpen, setIsLanguageComponentOpen]);

  const onToggleStarredQuery = useCallback(async () => {
    if (!starredQueriesService || !trimmedQuery) {
      return;
    }

    if (starredQueriesService.checkIfQueryIsStarred(trimmedQuery)) {
      setIsCurrentQueryStarred(false);
      await starredQueriesService.removeStarredQuery(trimmedQuery);
      return;
    }

    setIsCurrentQueryStarred(true);
    await starredQueriesService.addStarredQuery({
      queryString: trimmedQuery,
      status: 'success',
    });
  }, [setIsCurrentQueryStarred, starredQueriesService, trimmedQuery]);

  const onSubmitEsqlQuery = useCallback(
    (queryString: string) => {
      onUpdateAndSubmitQuery(queryString, QuerySource.HELP);
    },
    [onUpdateAndSubmitQuery]
  );

  const editorActions = useMemo(
    () => ({
      toggleVisor: onToggleVisor,
      toggleHistory: onToggleHistory,
      toggleStarredQuery: onToggleStarredQuery,
      toggleLanguageComponent: onToggleLanguageComponent,
      submitEsqlQuery: onSubmitEsqlQuery,
      isHistoryOpen,
      isCurrentQueryStarred,
      canToggleStarredQuery: Boolean(starredQueriesService && trimmedQuery),
      currentQuery: code,
      editorIsInline,
    }),
    [
      code,
      editorIsInline,
      isCurrentQueryStarred,
      isHistoryOpen,
      onSubmitEsqlQuery,
      onToggleHistory,
      onToggleLanguageComponent,
      onToggleStarredQuery,
      onToggleVisor,
      starredQueriesService,
      trimmedQuery,
    ]
  );

  return {
    editorActions,
    onClickQueryHistory,
  };
}
