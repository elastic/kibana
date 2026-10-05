/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMemo, useRef } from 'react';
import type { EsqlEditorActions } from './editor_actions_context';
import { useEsqlEditorActionsRegistration } from './editor_actions_context';

/**
 * Any subset of {@link EsqlEditorActions}. Unset fields fall back to safe defaults
 * (no-op handlers, `false` flags, empty query) when registered.
 */
export type EsqlEditorActionsRegisterProps = Partial<EsqlEditorActions>;

const noop = () => {};

/**
 * Registers a set of {@link EsqlEditorActions} into an ancestor
 * {@link EsqlEditorActionsProvider}, so a standalone {@link ESQLMenu} (mounted
 * without the full `ESQLEditor`) can drive whichever actions the host wires —
 * e.g. `currentQuery` + `submitEsqlQuery` to enable recommended queries. Handlers
 * left unset default to no-ops, so their menu buttons stay visible but inert.
 */
export const EsqlEditorActionsRegister = (props: EsqlEditorActionsRegisterProps): null => {
  const propsRef = useRef(props);
  propsRef.current = props;

  const stableActions = useMemo<EsqlEditorActions>(
    () => ({
      toggleVisor: () => (propsRef.current.toggleVisor ?? noop)(),
      toggleHistory: () => (propsRef.current.toggleHistory ?? noop)(),
      toggleStarredQuery: () => (propsRef.current.toggleStarredQuery ?? noop)(),
      toggleLanguageComponent: () => (propsRef.current.toggleLanguageComponent ?? noop)(),
      submitEsqlQuery: (query: string) => (propsRef.current.submitEsqlQuery ?? noop)(query),
      get isHistoryOpen() {
        return propsRef.current.isHistoryOpen ?? false;
      },
      get isCurrentQueryStarred() {
        return propsRef.current.isCurrentQueryStarred ?? false;
      },
      get canToggleStarredQuery() {
        return propsRef.current.canToggleStarredQuery ?? false;
      },
      get currentQuery() {
        return propsRef.current.currentQuery ?? '';
      },
      get editorIsInline() {
        return propsRef.current.editorIsInline ?? false;
      },
    }),
    []
  );

  useEsqlEditorActionsRegistration(stableActions);

  return null;
};
