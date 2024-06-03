/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AlertsGroupingState, GroupModel } from '../types';

const initialActiveGroups = ['none'];

export const AlertsGroupingContext = createContext({
  groupingState: {} as AlertsGroupingState,
  setGroupingState: (() => {}) as Dispatch<SetStateAction<AlertsGroupingState>>,
});

export const AlertsGroupingContextProvider = ({ children }: PropsWithChildren<{}>) => {
  const [groupingState, setGroupingState] = useState<AlertsGroupingState>({});
  return (
    <AlertsGroupingContext.Provider
      value={useMemo(
        () => ({ groupingState, setGroupingState }),
        [groupingState, setGroupingState]
      )}
    >
      {children}
    </AlertsGroupingContext.Provider>
  );
};

export const useAlertsGroupingState = (groupingId: string) => {
  const { groupingState, setGroupingState } = useContext(AlertsGroupingContext);
  const updateGrouping = useCallback(
    (groupModel: Partial<GroupModel> | null) => {
      if (groupModel === null) {
        setGroupingState((prevState) => {
          const newState = { ...prevState };
          delete newState[groupingId];
          return newState;
        });
        return;
      }
      setGroupingState((prevState) => ({
        ...prevState,
        [groupingId]: {
          // @ts-expect-error options might not be defined
          options: [],
          // @ts-expect-error activeGroups might not be defined
          activeGroups: initialActiveGroups,
          ...prevState[groupingId],
          ...groupModel,
        },
      }));
    },
    [setGroupingState, groupingId]
  );
  const grouping = useMemo(
    () => groupingState[groupingId] ?? { activeGroups: ['none'] },
    [groupingState, groupingId]
  );
  return {
    grouping,
    updateGrouping,
  };
};
