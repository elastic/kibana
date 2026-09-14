/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMemo } from 'react';
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
export const EsqlEditorActionsRegister = ({
  toggleVisor = noop,
  toggleHistory = noop,
  toggleStarredQuery = noop,
  toggleLanguageComponent = noop,
  submitEsqlQuery = noop,
  isHistoryOpen = false,
  isCurrentQueryStarred = false,
  canToggleStarredQuery = false,
  currentQuery = '',
  editorIsInline = false,
}: EsqlEditorActionsRegisterProps): null => {
  const actions = useMemo<EsqlEditorActions>(
    () => ({
      toggleVisor,
      toggleHistory,
      toggleStarredQuery,
      toggleLanguageComponent,
      submitEsqlQuery,
      isHistoryOpen,
      isCurrentQueryStarred,
      canToggleStarredQuery,
      currentQuery,
      editorIsInline,
    }),
    [
      toggleVisor,
      toggleHistory,
      toggleStarredQuery,
      toggleLanguageComponent,
      submitEsqlQuery,
      isHistoryOpen,
      isCurrentQueryStarred,
      canToggleStarredQuery,
      currentQuery,
      editorIsInline,
    ]
  );

  useEsqlEditorActionsRegistration(actions);

  return null;
};
