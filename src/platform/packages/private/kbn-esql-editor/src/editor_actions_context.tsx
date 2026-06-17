/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface EsqlEditorActions {
  toggleVisor: () => void;
  toggleHistory: () => void;
  toggleStarredQuery: () => void;
  submitEsqlQuery: (query: string) => void;
  isHistoryOpen: boolean;
  isCurrentQueryStarred: boolean;
  canToggleStarredQuery: boolean;
  currentQuery: string;
}

const EsqlEditorActionsContext = createContext<EsqlEditorActions | null>(null);
const EsqlEditorActionsRegisterContext = createContext<(actions: EsqlEditorActions | null) => void>(
  () => {}
);
const EsqlEditorActionsProviderContext = createContext(false);

export function EsqlEditorActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<EsqlEditorActions | null>(null);
  const registerActions = useCallback((nextActions: EsqlEditorActions | null) => {
    setActions(nextActions);
  }, []);

  return (
    <EsqlEditorActionsRegisterContext.Provider value={registerActions}>
      <EsqlEditorActionsProviderContext.Provider value={true}>
        <EsqlEditorActionsContext.Provider value={actions}>
          {children}
        </EsqlEditorActionsContext.Provider>
      </EsqlEditorActionsProviderContext.Provider>
    </EsqlEditorActionsRegisterContext.Provider>
  );
}

export function useEsqlEditorActions() {
  return useContext(EsqlEditorActionsContext);
}

export function useHasEsqlEditorActionsProvider() {
  return useContext(EsqlEditorActionsProviderContext);
}

export function useEsqlEditorActionsRegistration(actions: EsqlEditorActions | null) {
  const registerActions = useContext(EsqlEditorActionsRegisterContext);

  useEffect(() => {
    registerActions(actions);
    return () => registerActions(null);
  }, [actions, registerActions]);
}
