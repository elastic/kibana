/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ControlsChainingSystem,
  ControlsIgnoreParentSettings,
  ControlsLabelPosition,
} from '@kbn/controls-schemas';
import { StateComparators, initializeStateManager } from '@kbn/presentation-publishing';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '@kbn/controls-constants';
import { ControlGroupEditorState } from './types';

export const defaultEditorState = {
  autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
  chainingSystem: DEFAULT_CONTROLS_CHAINING as ControlsChainingSystem,
  ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS as ControlsIgnoreParentSettings,
  labelPosition: DEFAULT_CONTROLS_LABEL_POSITION as ControlsLabelPosition,
};

export const editorStateComparators: StateComparators<ControlGroupEditorState> = {
  autoApplySelections: 'referenceEquality',
  chainingSystem: 'referenceEquality',
  ignoreParentSettings: 'deepEquality',
  labelPosition: 'referenceEquality',
};

export function initializeEditorStateManager(initialState: ControlGroupEditorState) {
  return initializeStateManager<ControlGroupEditorState>(initialState, defaultEditorState);
}
