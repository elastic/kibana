/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, type SetStateAction, type Dispatch } from 'react';
import type { InTableSearchControlProps, UseFindMatchesState } from './types';

/** Context value includes match state so all toolbar instances share the same count/handlers. */
export interface InTableSearchContextValue extends InTableSearchControlProps {
  matchState: UseFindMatchesState;
  setMatchState: Dispatch<SetStateAction<UseFindMatchesState>>;
}

/**
 * Split into two contexts so that when only matchState updates, the control-props
 * context value stays stable. That prevents useFindMatches' effect from re-running
 * (its deps come from control props) and avoids a re-render loop.
 */
export interface InTableSearchMatchContextValue {
  matchState: UseFindMatchesState;
  setMatchState: Dispatch<SetStateAction<UseFindMatchesState>>;
}

/** Value passed to InTableSearchProvider: split so control props stay stable when match state updates. */
export interface InTableSearchProviderValue {
  controlPropsContextValue: InTableSearchControlProps;
  matchContextValue: InTableSearchMatchContextValue;
}

export const InTableSearchContext = createContext<InTableSearchContextValue | null>(null);

/** Stable control props (rows, visibleColumns, callbacks). Excluded from match-state updates. */
export const InTableSearchControlPropsContext = createContext<InTableSearchControlProps | null>(
  null
);

/** Match state only. Updates frequently; separate so control-props refs stay stable. */
export const InTableSearchMatchContext = createContext<InTableSearchMatchContextValue | null>(null);

export const InTableSearchControlPropsProvider = InTableSearchControlPropsContext.Provider;
export const InTableSearchMatchProvider = InTableSearchMatchContext.Provider;

/** Renders both split providers so a single value can drive stable control props + match state. */
export const InTableSearchProvider: React.FC<{
  value: InTableSearchProviderValue | null;
  children: React.ReactNode;
}> = ({ value, children }) => {
  if (!value) {
    return <>{children}</>;
  }
  return (
    <InTableSearchControlPropsContext.Provider value={value.controlPropsContextValue}>
      <InTableSearchMatchContext.Provider value={value.matchContextValue}>
        {children}
      </InTableSearchMatchContext.Provider>
    </InTableSearchControlPropsContext.Provider>
  );
};

export const useInTableSearchContext = (): InTableSearchContextValue => {
  const controlProps = useContext(InTableSearchControlPropsContext);
  const matchContext = useContext(InTableSearchMatchContext);

  if (!controlProps || !matchContext) {
    throw new Error('InTableSearchControl must be used inside of InTableSearchProvider');
  }

  return { ...controlProps, ...matchContext };
};

/** Hook used by useFindMatches. */
export const useInTableSearchControlProps = (): InTableSearchControlProps => {
  const context = useContext(InTableSearchControlPropsContext);

  if (!context) {
    throw new Error('InTableSearchControl must be used inside of InTableSearchProvider');
  }

  return context;
};

export const useInTableSearchMatchContext = (): InTableSearchMatchContextValue => {
  const context = useContext(InTableSearchMatchContext);

  if (!context) {
    throw new Error('InTableSearchControl must be used inside of InTableSearchProvider');
  }

  return context;
};
