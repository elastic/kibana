/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createAction } from '../../ui_actions';
import { ViewMode } from '../../types';
import { IEmbeddable } from '../..';

export const EDIT_MODE_ACTION = 'EDIT_MODE_ACTION';

export function createEditModeAction() {
  return createAction({
    id: EDIT_MODE_ACTION,
    type: EDIT_MODE_ACTION,
    getDisplayName: () => 'I only show up in edit mode',
    isCompatible: async (context: { embeddable: IEmbeddable }) =>
      context.embeddable.getInput().viewMode === ViewMode.EDIT,
    execute: async () => {},
  });
}
