/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reducer } from 'react';
import { cloneDeep } from 'lodash';

import type { EmbeddedConsoleAction, EmbeddedConsoleStore } from '../../types/embeddable_console';
import { EmbeddableConsoleView } from '../../types/embeddable_console';

export const initialValue: EmbeddedConsoleStore = {
  consoleHasBeenOpened: false,
  view: EmbeddableConsoleView.Closed,
};

export const reducer: Reducer<EmbeddedConsoleStore, EmbeddedConsoleAction> = (state, action) => {
  switch (action.type) {
    case 'open':
      const newView = action.payload?.alternateView
        ? EmbeddableConsoleView.Alternate
        : EmbeddableConsoleView.Console;
      if (state.view !== newView) {
        const draft = cloneDeep(state);
        draft.consoleHasBeenOpened = true;
        draft.view = newView;
        draft.loadFromContent = action.payload?.content;
        return draft;
      }
      break;
    case 'close':
      if (state.view !== EmbeddableConsoleView.Closed) {
        const draft = cloneDeep(state);
        draft.view = EmbeddableConsoleView.Closed;
        draft.loadFromContent = undefined;
        return draft;
      }
      break;
  }
  return state;
};
