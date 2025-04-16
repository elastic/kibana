/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeStateManager } from '@kbn/presentation-publishing';
import { ControlGroupEditorState } from './types';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '../../common';

export function initializeEditorStateManager(initialState: ControlGroupEditorState) {
  return initializeStateManager<ControlGroupEditorState>(initialState, {
    autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
    chainingSystem: DEFAULT_CONTROL_CHAINING,
    ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
    labelPosition: DEFAULT_CONTROL_LABEL_POSITION,
  });
}
