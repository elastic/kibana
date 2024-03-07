/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useRef,
  useCallback,
  type PropsWithChildren,
  type ReactElement,
  type ComponentProps,
  type Dispatch,
} from 'react';
import { EuiTab } from '@elastic/eui';

interface IDispatchAction {
  type: string;
  payload: unknown;
}

type IReducer<S> = (state: S, action: IDispatchAction) => S;

interface IModalTabActionBtn<S> {
  label: string;
  handler: (args: { state: S }) => void;
}

export type IModalTabContent<S extends Record<string, unknown>> = (props: {
  state: S;
  dispatch: Dispatch<IDispatchAction>;
}) => ReactElement;

export type IModalTabDeclaration<S extends Record<string, unknown>> = ComponentProps<
  typeof EuiTab
> & {
  id: string;
  title: string;
  initialState?: Partial<S>;
  reducer?: IReducer<S>;
  content: IModalTabContent<S>;
  modalActionBtn: IModalTabActionBtn<S>;
};

interface IModalMetaState {
  selectedTabId: string | null;
}

interface IModalContext {
  tabs: Array<Exclude<IModalTabDeclaration<Record<string, unknown>>, 'reducer' | 'initialState'>>;
  state: { meta: IModalMetaState } & Record<string, Record<string, unknown>>;
  dispatch: Dispatch<IDispatchAction>;
}

const ModalContext = createContext<IModalContext>({
  tabs: [],
  state: {
    meta: {
      selectedTabId: null,
    },
  },
  dispatch: () => {},
});

/**
 * @description defines state transition for meta information to manage the modal, new meta action types
 * must be prefixed with the string 'META_'
 */
const modalMetaReducer: IReducer<IModalMetaState> = (state, action) => {
  switch (action.type) {
    case 'META_selectedTabId':
      return {
        ...state,
        selectedTabId: action.payload as string,
      };
    default:
      return state;
  }
};

export function ModalContextProvider<
  T extends Array<IModalTabDeclaration<Record<string, unknown>>>
>({
  tabs,
  selectedTabId,
  children,
}: PropsWithChildren<{
  tabs: T;
  selectedTabId: T[number]['id'];
}>) {
  const modalTabDefinitions = useRef<IModalContext['tabs']>([]);

  const initialModalState = useRef<IModalContext['state']>({
    // instantiate state with default meta information
    meta: {
      selectedTabId,
    },
  });

  const reducersMap = useMemo(
    () =>
      tabs.reduce((result, { id, reducer, initialState, ...rest }) => {
        initialModalState.current[id] = initialState ?? {};
        modalTabDefinitions.current.push({ id, ...rest });
        result[id] = reducer;
        return result;
      }, {}),
    [tabs]
  );

  const combineReducers = useCallback(
    function (reducers: Record<string, IReducer<Record<string, unknown>>>) {
      return (state: IModalContext['state'], action: IDispatchAction) => {
        const newState = { ...state };

        if (/^meta_/i.test(action.type)) {
          newState.meta = modalMetaReducer(newState.meta, action);
        } else {
          newState[selectedTabId] = reducers[selectedTabId](newState[selectedTabId], action);
        }

        return newState;
      };
    },
    [selectedTabId]
  );

  const createInitialState = useCallback((state: IModalContext['state']) => {
    return state;
  }, []);

  const [state, dispatch] = useReducer(
    combineReducers(reducersMap),
    initialModalState.current,
    createInitialState
  );

  return (
    <ModalContext.Provider value={{ tabs: modalTabDefinitions.current, state, dispatch }}>
      {children}
    </ModalContext.Provider>
  );
}

export const useModalContext = () => useContext(ModalContext);
