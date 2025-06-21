/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

export interface TabRestorableStatePerComponent {
  [namespace: string]: Record<string, any>;
}

export type TabRestorableStatePerComponent$ = BehaviorSubject<
  TabRestorableStatePerComponent | undefined
>;

export interface TabContentContextProps {
  restorableStatePerTabContentComponent$: TabRestorableStatePerComponent$;
}

export const createRestorableStatePerTabContentComponent = (): TabRestorableStatePerComponent$ => {
  return new BehaviorSubject<TabRestorableStatePerComponent | undefined>(undefined);
};

const createTabContentContextValue = (): TabContentContextProps => {
  return {
    restorableStatePerTabContentComponent$: createRestorableStatePerTabContentComponent(),
  };
};

export const TabContentContext = createContext<TabContentContextProps>(
  createTabContentContextValue()
);

export const useTabContentContextValueMemo = (
  restorableStatePerTabContentComponent$: TabRestorableStatePerComponent$ | undefined
): TabContentContextProps => {
  return useMemo(() => {
    const defaultValue = createTabContentContextValue();
    return {
      ...defaultValue,
      restorableStatePerTabContentComponent$:
        restorableStatePerTabContentComponent$ ||
        defaultValue.restorableStatePerTabContentComponent$,
    };
  }, [restorableStatePerTabContentComponent$]);
};

export function useRestorableStateInTabContent<StateT extends Record<string, any>>(
  namespace: string,
  getDefaultState: () => StateT
): [StateT, (handler: (prevState: StateT) => StateT) => void] {
  const context = useContext(TabContentContext);
  const [state, setState] = useState<StateT>(() => getDefaultState());
  const restorableStatePerTabContentComponent$ = context?.restorableStatePerTabContentComponent$;

  useEffect(() => {
    const initialState = restorableStatePerTabContentComponent$?.getValue()?.[namespace];

    if (initialState) {
      setState(() => {
        const nextState: StateT = { ...getDefaultState() };
        Object.keys(initialState).forEach((key) => {
          if (key in nextState) {
            (nextState as Record<string, any>)[key] = initialState[key];
          }
        });
        return nextState;
      });
    }
  }, [namespace, restorableStatePerTabContentComponent$, getDefaultState]);

  const setRestorableState = useCallback(
    (handler: (prevState: StateT) => StateT) => {
      setState((prevState) => {
        const nextState = handler(prevState);
        restorableStatePerTabContentComponent$?.next({
          ...restorableStatePerTabContentComponent$.getValue(),
          [namespace]: nextState,
        });
        return nextState;
      });
    },
    [restorableStatePerTabContentComponent$, namespace]
  );

  return useMemo(() => [state, setRestorableState], [state, setRestorableState]);
}
