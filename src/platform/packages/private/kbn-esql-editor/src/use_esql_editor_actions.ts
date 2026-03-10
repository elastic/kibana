/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { QuerySource } from '@kbn/esql-types';
import type { EsqlEditorActions } from './editor_actions_context';
import type { EsqlStarredQueriesService } from './editor_footer/esql_starred_queries_service';

interface UseEsqlEditorActionsParams {
  code: string;
  isHistoryOpen: boolean;
  isCurrentQueryStarred: boolean;
  onUpdateAndSubmitQuery: (newQuery: string, source: QuerySource) => void;
  onVisorClosed?: () => void;
  starredQueriesService: EsqlStarredQueriesService | null;
  trimmedQuery: string;
  hasUserDismissedVisorAutoOpen: boolean;
  isVisorOpenRef: React.MutableRefObject<boolean>;
  setHasUserDismissedVisorAutoOpen: (value: boolean) => void;
  setIsHistoryOpen: (value: boolean) => void;
  setIsCurrentQueryStarred: (value: boolean) => void;
  setIsVisorOpen: (value: boolean) => void;
  trackQueryHistoryOpened: (isOpen: boolean) => void;
}

export function useEsqlEditorActions({
  code,
  isHistoryOpen,
  isCurrentQueryStarred,
  onUpdateAndSubmitQuery,
  onVisorClosed,
  starredQueriesService,
  trimmedQuery,
  hasUserDismissedVisorAutoOpen,
  isVisorOpenRef,
  setHasUserDismissedVisorAutoOpen,
  setIsHistoryOpen,
  setIsCurrentQueryStarred,
  setIsVisorOpen,
  trackQueryHistoryOpened,
}: UseEsqlEditorActionsParams): {
  editorActions: EsqlEditorActions;
  onClickQueryHistory: (isOpen: boolean) => void;
  onSubmitEsqlQuery: (queryString: string) => void;
  onToggleHistory: () => void;
  onToggleStarredQuery: () => Promise<void>;
  onToggleVisor: () => void;
} {
  const onToggleVisor = useCallback(() => {
    const isClosingVisor = isVisorOpenRef.current;
    setHasUserDismissedVisorAutoOpen(!hasUserDismissedVisorAutoOpen);
    setIsVisorOpen(!isVisorOpenRef.current);
    if (isClosingVisor) {
      onVisorClosed?.();
    }
  }, [
    hasUserDismissedVisorAutoOpen,
    isVisorOpenRef,
    onVisorClosed,
    setHasUserDismissedVisorAutoOpen,
    setIsVisorOpen,
  ]);

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
      submitEsqlQuery: onSubmitEsqlQuery,
      isHistoryOpen,
      isCurrentQueryStarred,
      canToggleStarredQuery: Boolean(starredQueriesService && trimmedQuery),
      currentQuery: code,
    }),
    [
      code,
      isCurrentQueryStarred,
      isHistoryOpen,
      onSubmitEsqlQuery,
      onToggleHistory,
      onToggleStarredQuery,
      onToggleVisor,
      starredQueriesService,
      trimmedQuery,
    ]
  );

  return {
    editorActions,
    onClickQueryHistory,
    onSubmitEsqlQuery,
    onToggleHistory,
    onToggleStarredQuery,
    onToggleVisor,
  };
}
