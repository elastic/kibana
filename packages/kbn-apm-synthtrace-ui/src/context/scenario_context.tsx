import React, { createContext, useReducer } from 'react';
import { Dispatch } from 'react';
import { INITIAL_STATE, reducer } from '../reducer';
import { Action } from '../reducer/actions';
import type { SynthtraceScenario } from '../typings';

export const ScenarioContext = createContext<{
  state: SynthtraceScenario;
  dispatch: Dispatch<Action>;
}>({ state: INITIAL_STATE, dispatch: () => INITIAL_STATE });

export function ScenarioContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  return (
    <ScenarioContext.Provider value={{ state, dispatch }}>{children}</ScenarioContext.Provider>
  );
}
