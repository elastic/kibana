/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { identity } from 'fp-ts/lib/function';

import {
  EmbeddableConsoleView,
  EmbeddedConsoleAction,
  EmbeddedConsoleStore,
} from '../../types/embeddable_console';

export const initialValue: EmbeddedConsoleStore = produce<EmbeddedConsoleStore>(
  {
    view: EmbeddableConsoleView.Closed,
  },
  identity
);

export const reducer: Reducer<EmbeddedConsoleStore, EmbeddedConsoleAction> = (state, action) =>
  produce<EmbeddedConsoleStore>(state, (draft) => {
    switch (action.type) {
      case 'open':
        const newView = action.payload?.alternateView
          ? EmbeddableConsoleView.Alternate
          : EmbeddableConsoleView.Console;
        if (state.view !== newView) {
          draft.view = newView;
          draft.loadFromContent = action.payload?.content;
          return draft;
        }
        break;
      case 'close':
        if (state.view !== EmbeddableConsoleView.Closed) {
          draft.view = EmbeddableConsoleView.Closed;
          draft.loadFromContent = undefined;
          return draft;
        }
        break;
    }
    return state;
  });
