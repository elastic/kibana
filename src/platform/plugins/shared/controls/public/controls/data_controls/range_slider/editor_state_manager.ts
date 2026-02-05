/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeSliderControlState } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing/state_manager';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';

export type EditorState = Pick<RangeSliderControlState, 'step'>;

export const editorComparators: StateComparators<EditorState> = {
  step: (a, b) => (a ?? 1) === (b ?? 1),
};

const defaultEditorState = {
  step: 1,
};

export const initializeEditorStateManager = (initialState: EditorState) => {
  return initializeStateManager<EditorState>(initialState, defaultEditorState, editorComparators);
};
