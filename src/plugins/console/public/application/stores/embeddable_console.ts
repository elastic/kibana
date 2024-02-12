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

import { EmbeddedConsoleAction, EmbeddedConsoleStore } from '../../types/embeddable_console';

export const initialValue: EmbeddedConsoleStore = produce<EmbeddedConsoleStore>(
  {
    isOpen: false,
  },
  identity
);

export const reducer: Reducer<EmbeddedConsoleStore, EmbeddedConsoleAction> = (state, action) =>
  produce<EmbeddedConsoleStore>(state, (draft) => {
    switch (action.type) {
      case 'open':
        if (!state.isOpen) {
          draft.isOpen = true;
          draft.loadFromContent = action.payload?.content;
          return;
        }
        break;
      case 'close':
        if (state.isOpen) {
          draft.isOpen = false;
          draft.loadFromContent = undefined;
          return;
        }
        break;
    }
    return draft;
  });
