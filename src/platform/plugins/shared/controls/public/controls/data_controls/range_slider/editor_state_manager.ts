/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeSliderControlState } from '@kbn/controls-schemas';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import { DEFAULT_RANGE_SLIDER_STATE } from '@kbn/controls-constants';
import { rangeSliderEditorComparators } from '../../../../common/state_comparison';

export type EditorState = Pick<RangeSliderControlState, 'step'>;

const defaultEditorState = {
  step: DEFAULT_RANGE_SLIDER_STATE.step,
};

export const initializeEditorStateManager = (initialState: EditorState) => {
  return initializeStateManager<EditorState>(
    initialState,
    defaultEditorState,
    rangeSliderEditorComparators
  );
};
