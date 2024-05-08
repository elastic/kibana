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
  type Dispatch,
} from 'react';
import { once } from 'lodash';

interface IDispatchAction {
  type: string;
  payload: any;
}

export type IDispatchFunction = Dispatch<IDispatchAction>;

export interface IMetaState {
  selectedTabId: string | null;
}

type IReducer<S> = (state: S, action: IDispatchAction) => S;

export interface ITabDeclaration<S = {}> {
  id: string;
  name: string;
  initialState?: Partial<S>;
  reducer?: IReducer<S>;
}

interface IModalContext<T extends Array<ITabDeclaration<Record<string, any>>>> {
  tabs: Array<Omit<T[number], 'reducer' | 'initialState'>>;
  state: {
    meta: IMetaState;
    [index: string]: any;
  };
  dispatch: Dispatch<IDispatchAction>;
}

const createStateContext = once(<T extends Array<ITabDeclaration<Record<string, any>>>>() =>
  createContext({
    tabs: [],
    state: {
      meta: {
        selectedTabId: null,
      },
    },
    dispatch: () => {},
  } as IModalContext<T>)
);

export const useModalContext = <T extends Array<ITabDeclaration<Record<string, any>>>>() =>
  useContext(createStateContext<T>());

/**
 * @description defines state transition for meta information to manage the modal, meta action types
 * must be prefixed with the string 'META_'
 */
const modalMetaReducer: IReducer<IMetaState> = (state, action) => {
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

export type IModalContextProviderProps<Tabs extends Array<ITabDeclaration<Record<string, any>>>> =
  PropsWithChildren<{
    /**
     * Array of tab declaration to be rendered into the modal that will be rendered
     */
    tabs: Tabs;
    /**
     * ID of the tab we'd like the modal to have selected on render
     */
    defaultSelectedTabId: Tabs[number]['id'];
  }>;

export function ModalContextProvider<T extends Array<ITabDeclaration<Record<string, any>>>>({
  tabs,
  defaultSelectedTabId,
  children,
}: IModalContextProviderProps<T>) {
  const ModalContext = createStateContext<T>();

  type IModalInstanceContext = IModalContext<T>;

  const modalTabDefinitions = useRef<IModalInstanceContext['tabs']>([]);

  const initialModalState = useRef<IModalInstanceContext['state']>({
    // instantiate state with default meta information
    meta: {
      selectedTabId: defaultSelectedTabId,
    },
  });

  const reducersMap = useMemo(
    () =>
      tabs.reduce((result, { reducer, initialState, ...rest }) => {
        initialModalState.current[rest.id] = initialState ?? {};
        // @ts-ignore
        modalTabDefinitions.current.push({ ...rest });
        result[rest.id] = reducer;
        return result;
      }, {} as Record<string, T[number]['reducer']>),
    [tabs]
  );

  const combineReducers = useCallback(function (reducers: Record<string, T[number]['reducer']>) {
    return (state: IModalInstanceContext['state'], action: IDispatchAction) => {
      const newState = { ...state };

      if (/^meta_/i.test(action.type)) {
        newState.meta = modalMetaReducer(newState.meta, action);
      } else {
        const selectedTabId = state.meta.selectedTabId!;
        const selectedTabReducer = reducers[selectedTabId];

        if (selectedTabReducer) {
          newState[selectedTabId] = selectedTabReducer(newState[selectedTabId], action);
        }
      }

      return newState;
    };
  }, []);

  const createInitialState = useCallback((state: IModalInstanceContext['state']) => {
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
