/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastSavedState } from './last_saved_state';
import { unsavedChanges } from './unsaved_changes';
import { ParentApi } from './types';

export function getParentApi(): ParentApi {
  return {
    /**
     * return last saved embeddable state
     */
    getSerializedStateForChild: (childId: string) => {
      const panel = lastSavedState.load().panels.find(({ id }) => {
        return id === childId;
      });
      return panel ? panel.panelState : undefined;
    },
    /**
     * return previous session's unsaved changes for embeddable
     */
    getRuntimeStateForChild: (childId: string) => {
      const panel = unsavedChanges.load().panels?.find(({ id }) => {
        return id === childId;
      });
      return panel ? panel.unsavedPanelChanges : undefined;
    },
  };
}
