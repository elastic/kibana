/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '../../types';
import { IEmbeddable } from '../..';
import { UiActionsActionDefinition } from '../../ui_actions';

export const EDIT_MODE_ACTION = 'EDIT_MODE_ACTION';

export function createEditModeActionDefinition(): UiActionsActionDefinition {
  return {
    id: EDIT_MODE_ACTION,
    type: EDIT_MODE_ACTION,
    getDisplayName: () => 'I only show up in edit mode',
    isCompatible: async (context: { embeddable: IEmbeddable }) =>
      context.embeddable.getInput().viewMode === ViewMode.EDIT,
    execute: async () => {},
  };
}
