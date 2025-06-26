/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  StateComparators,
  initializeStateManager,
} from '@kbn/presentation-publishing/state_manager';
import { OptionsListControlState } from '../../../../common/options_list';
import { DEFAULT_SEARCH_TECHNIQUE } from './constants';

export type EditorState = Pick<
  OptionsListControlState,
  'searchTechnique' | 'singleSelect' | 'runPastTimeout'
>;

export const editorComparators: StateComparators<EditorState> = {
  runPastTimeout: 'referenceEquality',
  searchTechnique: 'referenceEquality',
  singleSelect: 'referenceEquality',
};

const defaultEditorState = {
  searchTechnique: DEFAULT_SEARCH_TECHNIQUE,
  singleSelect: undefined,
  runPastTimeout: undefined,
};

export const initializeEditorStateManager = (initialState: EditorState) => {
  return initializeStateManager<EditorState>(initialState, defaultEditorState, editorComparators);
};
