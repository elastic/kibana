/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing/state_manager';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';

export type EditorState = Pick<
  OptionsListDSLControlState,
  'search_technique' | 'single_select' | 'run_past_timeout'
>;

export const editorComparators: StateComparators<EditorState> = {
  run_past_timeout: 'referenceEquality',
  search_technique: 'referenceEquality',
  single_select: 'referenceEquality',
};

const defaultEditorState = {
  search_technique: DEFAULT_DSL_OPTIONS_LIST_STATE.search_technique,
  single_select: DEFAULT_DSL_OPTIONS_LIST_STATE.single_select,
  run_past_timeout: DEFAULT_DSL_OPTIONS_LIST_STATE.run_past_timeout,
};

export const initializeEditorStateManager = (initialState: EditorState) => {
  return initializeStateManager<EditorState>(initialState, defaultEditorState, editorComparators);
};
