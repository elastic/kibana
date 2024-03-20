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
  type Dispatch,
} from 'react';
import { type EuiTabProps, type CommonProps } from '@elastic/eui';

interface IDispatchAction {
  type: string;
  payload: any;
}

export type IModalTabState = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IModalMetaState = {
  selectedTabId: string | null;
};

type IReducer<S extends IModalTabState> = (state: S, action: IDispatchAction) => S;

export type IModalTabContent<S extends IModalTabState> = (props: {
  state: S;
  dispatch: Dispatch<IDispatchAction>;
}) => ReactElement;

interface IModalTabActionBtn<S> extends CommonProps {
  id: string;
  dataTestSubj: string;
  defaultMessage: string;
  formattedMessageId: string;
  handler: (args: { state: S }) => void;
  isCopy?: boolean;
}

export interface IModalTabDeclaration<S extends IModalTabState> extends EuiTabProps {
  id: string;
  name: string;
  initialState?: Partial<S>;
  reducer?: IReducer<S>;
  description?: ReactElement;
  'data-test-subj'?: string;
  content?: IModalTabContent<S>;
  modalActionBtn: IModalTabActionBtn<S>;
}

interface IModalContext<S extends IModalTabState = IModalTabState> {
  tabs: Array<Exclude<IModalTabDeclaration<S>, 'reducer' | 'initialState'>>;
  state: { meta: IModalMetaState } & Record<string, S>;
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
 * @description defines state transition for meta information to manage the modal, meta action types
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

export type IModalContextProviderProps<Tabs extends Array<IModalTabDeclaration<IModalTabState>>> =
  PropsWithChildren<{
    tabs: Tabs;
    defaultSelectedTabId: Tabs[number]['id'];
  }>;

export function ModalContextProvider<T extends Array<IModalTabDeclaration<IModalTabState>>>({
  tabs,
  defaultSelectedTabId,
  children,
}: IModalContextProviderProps<T>) {
  const modalTabDefinitions = useRef<IModalContext['tabs']>([]);

  const initialModalState = useRef<IModalContext['state']>({
    // instantiate state with default meta information
    meta: {
      selectedTabId: defaultSelectedTabId,
    },
  });

  const reducersMap = useMemo(
    () =>
      tabs.reduce((result, { id, reducer, initialState, ...rest }) => {
        initialModalState.current[id] = initialState ?? {};
        modalTabDefinitions.current.push({ id, reducer, ...rest });
        result[id] = reducer;
        return result;
      }, {}),
    [tabs]
  );

  const combineReducers = useCallback(function (
    reducers: Record<string, IReducer<IModalTabState>>
  ) {
    return (state: IModalContext['state'], action: IDispatchAction) => {
      const newState = { ...state };

      if (/^meta_/i.test(action.type)) {
        newState.meta = modalMetaReducer(newState.meta, action);
      } else {
        const selectedTabId = state.meta.selectedTabId!;

        newState[selectedTabId] = reducers[selectedTabId](newState[selectedTabId], action);
      }

      return newState;
    };
  },
  []);

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
