/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { UnsavedChange } from './types';

const ChangesDispatchContext = React.createContext<void | null>(null);

export interface ChangesDispatchProviderProps {
  children: React.ReactNode;
  dispatch: void;
}

export interface ChangesDispatchAction {
  type: string;
  id?: string;
  change?: UnsavedChange;
}

export const ChangesDispatchProvider = ({ children, dispatch }: ChangesDispatchProviderProps) => {
  return (
    <ChangesDispatchContext.Provider value={dispatch}>{children}</ChangesDispatchContext.Provider>
  );
};

export function useChangesDispatch() {
  return useContext(ChangesDispatchContext);
}

export function changesReducer(changes: UnsavedChange[], action: ChangesDispatchAction) {
  switch (action.type) {
    case 'added': {
      return [
        ...changes,
        {
          id: action.id,
          change: action.change,
        },
      ];
    }
    case 'deleted': {
      return [
        ...changes,
        {
          id: action.id,
          change: action.change,
        },
      ];
    }
    case 'cleared': {
      return changes.filter((change) => change.id !== action.id);
    }
    default: {
      throw Error('Unknown action: ' + action.type);
    }
  }
}

export const initialChanges: UnsavedChange[] = [];
