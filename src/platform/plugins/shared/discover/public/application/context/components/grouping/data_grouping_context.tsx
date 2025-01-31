/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, PropsWithChildren, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DataGroupingState, GroupModel } from './types';

const initialActiveGroups = ['none'];

export const DataGroupingContext = createContext({
  groupingState: {} as DataGroupingState,
  setGroupingState: (() => {}) as Dispatch<SetStateAction<DataGroupingState>>,
});

export const DataGroupingContextProvider = ({ children }: PropsWithChildren<{}>) => {
  const [groupingState, setGroupingState] = useState<DataGroupingState>({});
  return (
    <DataGroupingContext.Provider
      value={useMemo(
        () => ({ groupingState, setGroupingState }),
        [groupingState, setGroupingState]
      )}
    >
      {children}
    </DataGroupingContext.Provider>
  );
};

export const useDataGroupingState = (groupingId: string) => {
  const { groupingState, setGroupingState } = useContext(DataGroupingContext);
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
